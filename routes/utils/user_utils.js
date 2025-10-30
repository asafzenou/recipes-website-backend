const DButils = require("./DButils");

async function markAsFavorite(user_id, recipe_id){

  if (!user_id || !recipe_id) {
    throw { status: 400, message: "Missing user_id or recipe_id" }; 
  }

  const exists = await DButils.execQuery(`SELECT 1 FROM favorites WHERE user_id = '${user_id}' AND recipe_id = ${recipe_id}`);

  const origin = exists.length > 0 ? 'DB' : 'API';
  const insert = `INSERT INTO favorites (user_id, recipe_id, origin) VALUES ('${user_id}', ${recipe_id}, '${origin}')`;
  
  await DButils.execQuery(insert);

}

async function removeFavorite(user_id, recipe_id) {
  if (!user_id || !recipe_id) {
    throw { status: 400, message: "Missing user_id or recipe_id" };
  }
  await DButils.execQuery(
    `DELETE FROM favorites WHERE user_id = '${user_id}' AND recipe_id = ${recipe_id}`
  );
}

async function getFavoriteRecipesDB(user_id) {
  const result = await DButils.execQuery(`CALL my_favorite_json(${user_id})`);
  return result[0][0].favorite_recipes; 
//   [
//   [ // index 0 - rows returned by SELECT inside the procedure
//     {
//       favorite_recipes: '[{...}, {...}]' // JSON string בתוך אובייקט
//     }
//   ],
//   [ // index 1 - metadata (fields, column info, וכו')
//     ...
//   ]
// ]
}

async function getFavoriteRecipesORIGIN(user_id) {
  const result = await DButils.execQuery(`SELECT recipe_id, origin FROM favorites where user_id = ${user_id}`);
  return result; 
}

async function isRecipeFavorite(user_id, recipe_id){
    const result = await DButils.execQuery(
    `SELECT 1 FROM favorites WHERE user_id = ${user_id} AND recipe_id = ${recipe_id}`
  );
  return result.length > 0;
}

async function isRecipeViewed(user_id, recipe_id){
    const result = await DButils.execQuery(
    `SELECT 1 FROM views WHERE user_id = ${user_id} AND recipe_id = ${recipe_id}`
  );
  return result.length > 0;
}

async function getMyRecipes(user_id){
    const result = await DButils.execQuery(`CALL get_my_recipes_json(${user_id})`);
    return result[0][0].recipes;
}

async function getMyFamilyRecipes(user_id){
    const result = await DButils.execQuery(`CALL get_family_recipes_by_user_id_json(${user_id})`);
    return result[0][0].family_recipes;
}

async function getLastWatchedRecipes(user_id) {
    const result = await DButils.execQuery(`CALL get_last_watched_recipes_json(${user_id})`);
    return result[0][0].last_watched_recipes;
}



async function searchUsersByName(first_name, last_name) {
  if (!first_name && !last_name) {
    throw { status: 400, message: "At least one of first_name or last_name must be provided" };
  }

  let query = `SELECT CONCAT(firstname, ' ', lastname) as full_name, username FROM users WHERE `;
  const conditions = [];
  
  if (first_name) {
    conditions.push(`firstname LIKE '%${first_name}%'`);
  }
  
  if (last_name) {
    conditions.push(`lastname LIKE '%${last_name}%'`);
  }
  
  query += conditions.join(' OR ');

  const result = await DButils.execQuery(query);
  return result;
}



async function addFamilyMember(my_username, family_username) {
  if (!my_username || !family_username) {
    throw { status: 400, message: "Both usernames are required" };
  }

  // Check if the relationship already exists
  const exists = await DButils.execQuery(
    `SELECT 1 FROM family WHERE my_username = ? AND family_username = ?`,
    [my_username, family_username]
  );

  if (exists.length > 0) {
    throw { status: 409, message: "Family member already exists" };
  }

  // Insert new relationship
  await DButils.execQuery(
  `INSERT INTO family (my_username, family_username) VALUES (?, ?), (?, ?)`,
  [my_username, family_username, family_username, my_username]
  );
}


async function getUsernameFromUserId(user_id) {
  if (!user_id) {
    throw { status: 400, message: "Missing user_id" };
  }

  const result = await DButils.execQuery(
    `SELECT username FROM users WHERE id = ?`,
    [user_id]
  );

  if (result.length === 0) {
    throw { status: 404, message: "User not found" };
  }

  return result[0].username;
}

exports.getUsernameFromUserId = getUsernameFromUserId;
exports.addFamilyMember = addFamilyMember;
exports.searchUsersByName = searchUsersByName;
exports.markAsFavorite = markAsFavorite;
exports.getFavoriteRecipesDB = getFavoriteRecipesDB;
exports.getFavoriteRecipesORIGIN = getFavoriteRecipesORIGIN;
exports.isRecipeFavorite = isRecipeFavorite;
exports.isRecipeViewed = isRecipeViewed;
exports.getMyRecipes = getMyRecipes;
exports.getMyFamilyRecipes = getMyFamilyRecipes;
exports.getLastWatchedRecipes = getLastWatchedRecipes;
exports.removeFavorite = removeFavorite;