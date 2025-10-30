var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");
const user_utils = require("./utils/user_utils");



// Debug middleware for all requests to this router
router.use((req, res, next) => {
  console.log(`=== RECIPES ROUTER: ${req.method} ${req.path} ===`);
  console.log("Full URL:", req.originalUrl);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  next();
});

router.get("/", (req, res) => res.send("im here"));

router.get('/search', async (req, res, next) => {
  let input_json = {};
  try {
    const {
      query = '',
      cuisine = '',
      diet = '',
      intolerances = '',
      number = 5,
      sort = '' // preparationTime | popularity
    } = req.query;

    // Map local sort option to Spoonacular sort param
    const sortMap = {
      preparationTime: 'readyInMinutes',
      popularity: 'popularity'
    };

    input_json = {
      query,
      cuisine,
      diet,
      intolerances,
      number: parseInt(number, 10),
      sort: sortMap[sort] || ''
    };
    const response = await recipes_utils.searchRecipes(input_json);

    const results = response;

    if (!results || results.length === 0) {
      res.status(200).send({ message: 'No recipes found', results: [] });
    } else {
      res.status(200).send(results);
    }

  } catch (error) {
    console.error("Error in /Search route:", error);
    res.status(500).send({ message: "Failed to fetch recipes", error: error.message });
  }
});

router.get("/random", async (req, res, next) => {
  try {
    const recipes = await recipes_utils.getRandomRecipes();
    res.send(recipes);
  } catch (error) {
    next(error);
  }
});

/**
 * This path returns a full details of a recipe by its id
 */
router.get("/:recipeId", async (req, res, next) => {
  const recipeId = req.params.recipeId;
  const userId = req.session.user_id; 

  console.log("Received request for recipe details");
  console.log("recipeId", recipeId);
  console.log("userId", userId);

  try {
    const recipe = await recipes_utils.getRecipeDetails(recipeId, userId);
    res.send(recipe);
  } catch (error) {
    next(error);
  }
});

router.get('/PreviewRecipe/:recipeId', async (req, res, next) => {
  const recipeId = req.params.recipeId;
  const userId = req.session.user_id; 

  console.log("PreviewRecipe called");
  console.log("recipeId", recipeId);
  console.log("userId", userId);

  try {
    // First check if recipe exists in database
    const dbRecipe = await recipes_utils.getRecipeFromDB(recipeId, userId);
    
    if (dbRecipe) {
      // Recipe found in database
      console.log("Recipe found in DB");
      res.status(200).send({recipe: dbRecipe, origin: 'DB'});
    } else {
      // Recipe not in database, fetch from API
      console.log("Recipe not found in DB, fetching from API");
      const recipe = await recipes_utils.getFullRecipeDetails(recipeId, userId);
      res.status(200).send({recipe, origin: 'API'});
    }
  } catch (error) {
    next(error);
  }
});

router.post('/CreateNewRecipe', async (req, res, next) => {
  const user_id = req.session.user_id;

  const {
    title,
    image_url,
    prep_time,
    servings,
    instructions,
    extendedIngredients,
    likes_count,
    is_vegan,
    is_vegetarian,
    is_gluten_free
  } = req.body;

  console.log("CreateNewRecipe called");
  console.log("userId", user_id);

  let recipe_json = {
    user_id,
    title,
    image_url,
    prep_time,
    servings,
    instructions,
    extendedIngredients,
    likes_count,
    is_vegan,
    is_vegetarian,
    is_gluten_free
  };
  try {
    await recipes_utils.CreateNewRecipe(recipe_json);
    res.status(200).send({ message: "Recipe added", success: true });
  } catch (error) {
    console.error("Error creating new recipe:", error);
    if (error.message === 'Invalid recipe data') {
      res.status(400).send({ message: error.message, success: false });
      return;
    }
    res.status(500).send({ message: error.message, success: false });
    next(error);
  }
});

/** 
 * Set recipe as viewed
 */
router.post('/viewed', async (req, res, next) => {
  console.log("=== POST /viewed route reached ===");
  console.log("Request body:", req.body);
  console.log("Session user_id:", req.session.user_id);
  console.log("Session object:", req.session);
  console.log("Cookies:", req.headers.cookie);
  
  try {
    // Try to get user_id from session first, then from request body as fallback
    const user_id = req.session.user_id //|| req.body.userId;
    const recipe_id = req.body.recipeId;
    const origin = req.body.origin;
    
    console.log("Processing markAsViewed with:", { user_id, recipe_id, origin });
    
    if (user_id === undefined || user_id === null) {
      return res.status(401).send({ message: "User not authenticated", success: false });
    }
    
    await recipes_utils.markAsViewed(user_id, recipe_id, origin);
    res.status(200).send("The Recipe successfully marked as viewed");
    
  } catch (error) {
    next(error);
  }
});




module.exports = router;