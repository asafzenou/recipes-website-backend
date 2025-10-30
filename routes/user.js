var express = require("express");
var router = express.Router();
const DButils = require("./utils/DButils");
const user_utils = require("./utils/user_utils");
const recipe_utils = require("./utils/recipes_utils");

/**
 * Authenticate all incoming requests by middleware
 */
router.use(async function (req, res, next) {
  if (req.session && req.session.user_id) {
    DButils.execQuery("SELECT id FROM users").then((users) => {
      if (users.find((x) => x.id === req.session.user_id)) {
        req.user_id = req.session.user_id;
        next();
      }
    }).catch(err => next(err));
  } else {
    res.sendStatus(401);
  }
});


/**
 * This path gets body with recipeId and save this recipe in the favorites list of the logged-in user
 */
router.post('/favorites', async (req,res,next) => {
  try{
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;
    await user_utils.markAsFavorite(user_id,recipe_id);
    res.status(200).send("The Recipe successfully saved as favorite");
    } catch(error){
    next(error);
  }
})

/**
 * This path removes a recipe from the favorites list of the logged-in user
 */ 
router.delete('/favorites', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const recipe_id = req.body.recipeId;

    if (!recipe_id) {
      throw { status: 400, message: "Missing recipe_id" };
    }

    await user_utils.removeFavorite(user_id, recipe_id);
    res.status(200).send("The Recipe successfully removed from favorites");
  } catch (error) {
    next(error);
  }
});

/**
 * This path returns the favorites recipes that were saved by the logged-in user
 */
router.get('/favorites', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    // Get the list of favorite recipes (should include recipe_id and origin)
    const favorite_recipes = await user_utils.getFavoriteRecipesORIGIN(user_id);

    // For each favorite, get the full details based on its origin
    const recipeDetailsPromises = favorite_recipes.map(async (entry) => {
      try {
        if (entry.origin === "API") {
          return await recipe_utils.getRecipeDetails(entry.recipe_id, user_id);
        } else if (entry.origin === "DB") {
          return await recipe_utils.getRecipeFromDB(entry.recipe_id, user_id);
        } else {
          throw new Error(`Unknown recipe origin: ${entry.origin}`);
        }
      } catch (err) {
        // Optionally log or handle the error for this entry
        return null; // or you can return { error: err.message, recipe_id: entry.recipe_id }
      }
    });

    // Wait for all promises to settle
    const results = await Promise.allSettled(recipeDetailsPromises);

    // Filter out failed or null results
    const detailedRecipes = results
      .filter(r => r.status === "fulfilled" && r.value)
      .map(r => r.value);

    res.status(200).json(detailedRecipes);
  } catch (error) {
    next(error);
  }
});

router.get('/myRecipes', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const my_recipes = await user_utils.getMyRecipes(user_id);
    res.status(200).json(my_recipes);
  } catch (error) {
    next(error);
  }
});

router.get('/myFamilyRecipes', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;
    const my_family_recipes = await user_utils.getMyFamilyRecipes(user_id);
    res.status(200).json(my_family_recipes);
  } catch (error) {
    next(error);
  }
});

router.get('/lastWatchedRecipes', async (req, res, next) => {
  try {
    const user_id = req.session.user_id;

    const last_watched = await user_utils.getLastWatchedRecipes(user_id);
    const recipeDetailsPromises = last_watched.map(async (entry) => {
      if (entry.origin === "API") {
        return await recipe_utils.getRecipeDetails(entry.recipe_id, user_id);
      } else if (entry.origin === "DB") {
        return await recipe_utils.getRecipeFromDB(entry.recipe_id, user_id);
      } else {
        throw new Error(`Unknown recipe origin: ${entry.origin}`);
      }
    });
    const detailedRecipes = await Promise.all(recipeDetailsPromises);
    res.status(200).json(detailedRecipes);
  } catch (error) {
    next(error);
  }
});

router.get('/searchUsers', async (req, res, next) => {
  try {
    const { first_name, last_name } = req.query;
    const results = await user_utils.searchUsersByName(first_name, last_name);
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
});


/**
 * This path adds a family member for the logged-in user
 * Expects: { family_username: "other_username" } in the request body
 */
router.post('/addToFamily', async (req, res, next) => {
  try {
    // Assuming you store the username in the session after login
    const user_id = req.session.user_id;
    const { family_username } = req.body;

    const my_username = await user_utils.getUsernameFromUserId(user_id);
    if (!my_username) {
      return res.status(401).send({ message: "Not logged in" });
    }
    if (!family_username) {
      return res.status(400).send({ message: "Missing family_username" });
    }

    await user_utils.addFamilyMember(my_username, family_username);
    res.status(200).send({ message: "Family member added successfully" });
  } catch (error) {
    res.status(error.status || 500).send({ message: error.message || "Internal server error" });
  }
});

module.exports = router;
