require("dotenv").config();
const user_utils = require("./user_utils");
const api_utils = require("./recipes_utils_api");
const db_utils = require("./recipes_utils_db");

async function getRandomRecipes() {
  const raw_recipes = await api_utils.getRandomRecipesRaw();
  const promises = raw_recipes.map((r) => getRecipeDetails(r.id));
  return await Promise.all(promises);
}

async function getRecipeDetails(recipe_id, user_id=null) {
    let recipe_info = await api_utils.getRecipeInformation(recipe_id);
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree } = recipe_info.data;

    let is_favorite = false;
    let is_viewed = false;
    is_favorite = await user_utils.isRecipeFavorite(user_id ,recipe_id);
    is_viewed = await user_utils.isRecipeViewed(user_id ,recipe_id);

    return {
        id: id,
        title: title,
        readyInMinutes: readyInMinutes,
        image: image,
        popularity: aggregateLikes,
        vegan: vegan,
        vegetarian: vegetarian,
        glutenFree: glutenFree,
        favorite: is_favorite,
        viewed: is_viewed
    }
}

async function getFullRecipeDetails(recipe_id, user_id=null) {
    let recipe_info = await api_utils.getRecipeInformation(recipe_id);
    let recipe_instructions = await api_utils.getRecipeInstructions(recipe_id);
    let recipe_instructions_as_string = "";
    try {
      recipe_instructions_as_string = recipe_instructions.data[0].steps.map((step) => step.step).join("\n");
    }
    catch (error) {
      recipe_instructions_as_string = "No instructions available.";
    }
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree, servings, extendedIngredients} = recipe_info.data;
    try {
      extendedIngredients = extendedIngredients.map((ingredient) => ingredient.original).join("\n");
    }
    catch (error) {
      extendedIngredients = "No ingredients available.";
    }
    let is_favorite = false;
    let is_viewed = false;
    is_favorite = await user_utils.isRecipeFavorite(user_id ,recipe_id);
    is_viewed = await user_utils.isRecipeViewed(user_id ,recipe_id);

    return {
        id: id,
        title: title,
        readyInMinutes: readyInMinutes,
        image: image,
        popularity: aggregateLikes,
        vegan: vegan,
        vegetarian: vegetarian,
        glutenFree: glutenFree,
        favorite: is_favorite,
        viewed: is_viewed,
        amount: servings,
        ingredients: extendedIngredients,
        instructions: recipe_instructions_as_string
    }
}

async function CreateNewRecipe(recipe_json) {
  // Validate the recipe_json object
  if (
  !recipe_json ||
  recipe_json.title == null ||
  recipe_json.image_url == null ||
  recipe_json.prep_time == null ||
  recipe_json.servings == null ||
  recipe_json.instructions == null ||
  recipe_json.extendedIngredients == null ||
  recipe_json.likes_count == null ||
  recipe_json.is_vegan == null ||
  recipe_json.is_vegetarian == null ||
  recipe_json.is_gluten_free == null
) {
    throw new Error("Invalid recipe data");
  }

  // Create a new recipe in the database
  await db_utils.createNewRecipe(recipe_json);
  
  // Return the newly created recipe
  
}


async function searchRecipes(input_json){
  const {
    query = '',
    cuisine = '',
    diet = '',
    intolerances = '',
    number = 5,
    sort = '' // preparationTime | popularity
  } = input_json;

  const sortMap = {
    preparationTime: 'readyInMinutes',
    popularity: 'popularity'
  };

  json_for_query = {
    query,
    cuisine,
    diet,
    intolerances,
    number,
    sort,
    addRecipeInformation: true
  };
  const response = await api_utils.searchRecipes(json_for_query);
  if (response == null || response.length == 0) {
    throw new Error("No recipes found");
  }

  return response
}


async function markAsViewed(user_id, recipe_id, origin) {
  await db_utils.markAsViewed(user_id, recipe_id, origin);
}

/**
 * This function retrieves a recipe from the database by its ID.
 * @param {*} recipe_id 
 * @param {*} user_id 
 * @returns json object with recipe details
 */
async function getRecipeFromDB(recipe_id, user_id = null) {
  try {
    const recipe_query = await db_utils.getRecipeFromDB(recipe_id);

    if (recipe_query.length === 0) {
      throw new Error("Recipe not found in DB");
    }

    const recipe = recipe_query[0];

    const is_favorite = user_id ? await user_utils.isRecipeFavorite(user_id, recipe_id) : false;
    const is_viewed = user_id ? await user_utils.isRecipeViewed(user_id, recipe_id) : false;

    return {
      id: recipe.id,
      title: recipe.title,
      readyInMinutes: recipe.prep_time,
      image: recipe.image_url,
      popularity: recipe.likes_count,
      vegan: recipe.is_vegan === 1,
      vegetarian: recipe.is_vegetarian === 1,
      glutenFree: recipe.is_gluten_free === 1,
      favorite: is_favorite,
      viewed: is_viewed,
      amount: recipe.servings,
      ingredients: recipe.extendedIngredients,
      instructions: recipe.instructions
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getRecipeDetails,
  getRandomRecipes,
  getFullRecipeDetails,
  CreateNewRecipe,
  searchRecipes,
  markAsViewed,
  getRecipeFromDB
};

