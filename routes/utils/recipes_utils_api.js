const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";


/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */

async function getRandomRecipesRaw() {
  const response = await axios.get(`${api_domain}/random`, {
    params: {
      number: 3,
      apiKey: process.env.spooncular_apiKey,
    },
  });
  return response.data.recipes;
}

async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: process.env.spooncular_apiKey
        }
    });
}

async function getRecipeInstructions(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/analyzedInstructions`, {
        params: {
            id: recipe_id,
            stepBreakdown: true,
            apiKey: process.env.spooncular_apiKey
        }
    });
}

async function searchRecipes(input_json) {
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

  const response = await axios.get(`${api_domain}/complexSearch`, {
    params: {
      apiKey: process.env.spooncular_apiKey,
      query,
      cuisine,
      diet,
      intolerances,
      number,
      sort: sortMap[sort] || '',
      addRecipeInformation: true // returns instructions and more details
    }
  });

  return response.data.results.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    readyInMinutes: recipe.readyInMinutes,
    popularity: recipe.aggregateLikes,
    vegan: recipe.vegan,
    vegetarian: recipe.vegetarian,
    glutenFree: recipe.glutenFree
  }));
}


module.exports = {
  getRandomRecipesRaw,
  getRecipeInformation,
  getRecipeInstructions,
  searchRecipes,
};