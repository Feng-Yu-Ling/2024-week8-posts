const express = require('express');
// 建立一個新的路由object來處理路由
const bcrypt = require('bcryptjs');
const appError = require('../service/appError');
const jwt = require('jsonwebtoken');
const handleErrorAsync = require('../service/handleErrorAsync');
const validator = require('validator');
const User = require('../models/usersModel');
const Post = require("../models/postsModel");
const {isAuth, generateSendJWT} = require("../service/auth");
const { app } = require('firebase-admin');
const router = express.Router();



// 動資料庫是昂貴的，先寫防呆機制

// 設置路由器進行註冊
router.post("/sign_up", handleErrorAsync(async(req, res, next)=>{
  let {email, password, confirmPassword, name} = req.body;
  // 內容不可為空
  if(!email || !password || !confirmPassword || !name){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "欄位未填寫正確", next));
  }
  // 密碼不正確
  if(password!==confirmPassword){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "密碼不一致", next));
  }
  // 密碼不少於8碼
  if(!validator.isLength(password, {min: 8})){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "密碼字數低於8碼", next));
  }
  // 密碼必須為英數混合
  if(password){
    // validator並沒有提供英數混合的檢查，所以透過正則表達式實現
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if(!hasLetter || !hasNumber){
      /* next()會進到下一個程式堆疊，
      若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
      return next(appError("400", "密碼必須為英數混合", next));
    }
  }

  // 名字不少於2個字元
  if(!validator.isLength(name, {min: 2})){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "名字不能少於2個字元", next));
  }
  
  // 是否為Email
  if(!validator.isEmail(email)){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "Email格式不正確", next));
  }
  // findOne()是非同步方法，需要等待結果才能確定是否有找到相同email
  if(await User.findOne({email})){
    return next(appError("400", "此Email已註冊過", next));
  }

  // 加密密碼
  password = await bcrypt.hash(req.body.password, 12);
  // Property Shorthand: 當object的屬性名和變數名相同時，可以只寫一次屬性名，讓程式碼更簡潔
  const newUser = await User.create({
    email,
    password,
    name
  });
  // 將res帶到generateSendJWT函式
  generateSendJWT(newUser,201,res);
}))


// 設置路由器進行登入
router.post("/sign_in", handleErrorAsync(async(req, res, next)=>{
  const {email, password} = req.body;
  if(!email || !password){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "帳號密碼不可為空", next))
  }
  // select()用於查詢時須返回哪些欄位，選擇包含("+")或排除("-")特定欄位
  const user = await User.findOne({email}).select("+password");
  // 查詢不到此email
  if(!user){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "查詢不到此email", next))
  }
  const auth = await bcrypt.compare(password, user.password);
  // 密碼不正確
  if(!auth){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "您的密碼不正確", next))
  }
  // 將res帶到generateSendJWT函式
  generateSendJWT(user, 200, res);
}))


// 設置路由器取得用戶資料
router.get("/profile/", isAuth, handleErrorAsync(async(req, res, next)=>{
  res.status(200).json({
    status: "success",
    user: req.user
  });
}))


// 設置路由器更新用戶資料
router.patch("/profile/", isAuth, handleErrorAsync(async(req, res, next)=>{
  let { name } = req.body;

  /*
  雖然req.user物件包含的是_id
  {
    _id: new ObjectId("1233211234567"),
    name: '小咪',
    following: [],
    followers: [],
  }
  而Mongoose會自動生成id屬性，其值為_id屬性的字串表示。
  這個id屬性是一個虛擬屬性，透過console.log(req.user)時不會列出id屬性，
  除非顯式訪問console.log(req.user.id)。
  */
  const id = req.user.id;
  // 內容不可為空
  if(!name){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "欄位未填寫正確", next));
  };
  // 即使只更新一個欄位，也必須將它包裹在大括號
  const updateName = await User.findByIdAndUpdate(id, {name: name}, {runValidators:true, new:true});
  res.json({
    "status":"success",
    updateName
  })
}))


// 設置路由器更新用戶密碼
router.post("/updatePassword", isAuth, handleErrorAsync(async(req, res, next)=>{
  const {password, confirmPassword} = req.body;
  if(password !== confirmPassword){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "密碼不一致！", next));
  }
  // 密碼不少於8碼
  if(!validator.isLength(password, {min: 8})){
    /* next()會進到下一個程式堆疊，
    若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
    return next(appError("400", "密碼字數低於8碼", next));
  }
  // 密碼必須為英數混合
  if(password){
    // validator並沒有提供英數混合的檢查，所以透過正則表達式實現
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if(!hasLetter || !hasNumber){
      /* next()會進到下一個程式堆疊，
      若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
      return next(appError("400", "密碼必須為英數混合", next));
    }
  }
  const newPassword = await bcrypt.hash(password, 12);


  /*
  雖然req.user物件包含的是_id
  {
    _id: new ObjectId("1233211234567"),
    name: '小咪',
    following: [],
    followers: [],
  }
  而Mongoose會自動生成id屬性，其值為_id屬性的字串表示。
  這個id屬性是一個虛擬屬性，透過console.log(req.user)時不會列出id屬性，
  除非顯式訪問console.log(req.user.id)。
  */
  const user = await User.findByIdAndUpdate(req.user.id, {
    password: newPassword
  });
  // 將res帶到generateSendJWT函式
  generateSendJWT(user, 200, res)
}))

// 設置路由器取得個人按讚列表
router.get("/getLikeList", isAuth, handleErrorAsync(async function(req, res, next){

  /*
  雖然req.user物件包含的是_id
  {
    _id: new ObjectId("1233211234567"),
    name: '小咪',
    following: [],
    followers: [],
  }
  而Mongoose會自動生成id屬性，其值為_id屬性的字串表示。
  這個id屬性是一個虛擬屬性，透過console.log(req.user)時不會列出id屬性，
  除非顯式訪問console.log(req.user.id)。
  */
  const likeList = await Post.find({
    // 尋找likes陣列中有包含req.user.id的貼文
    likes: {$in: [req.user.id]}
  }).populate({
    // path指向要填充(populate)的欄位為"user"
    path: "user",
    // select表示關聯查詢後要顯示的欄位為"name"及"_id"
    select: "name _id"
  });
  res.status(200).json({
    status: "success",
    likeList
  });
}))


// 設置路由器追蹤一位朋友
router.post("/:id/follow", isAuth, handleErrorAsync(async function(req, res, next){

  /*
  雖然req.user物件包含的是_id
  {
    _id: new ObjectId("1233211234567"),
    name: '小咪',
    following: [],
    followers: [],
  }
  而Mongoose會自動生成id屬性，其值為_id屬性的字串表示。
  這個id屬性是一個虛擬屬性，透過console.log(req.user)時不會列出id屬性，
  除非顯式訪問console.log(req.user.id)。
  */
  if(req.params.id === req.user.id){
    return next(appError(401, "您無法追蹤自己", next));
  }

  /*
  updateOne()在不匹配任何文件情況下

  1. 查詢條件不匹配表示無需更新。
  2. 仍被視為成功，因為執行了查詢和更新，即使無實際修改。
  */
  await User.updateOne(
    {
      /*
      尋找_id為req.user.id (當前用戶)並且
      following陣列的user屬性中不包含req.params.id的文檔
      */
      _id: req.user.id,
      "following.user": {$ne: req.params.id}
    },
    {
      // 在following陣列添加user屬性為req.params.id的物件
      $addToSet: {following: {user: req.params.id}}
    }
  );

  /*
  updateOne()在不匹配任何文件情況下

  1. 查詢條件不匹配表示無需更新。
  2. 仍被視為成功，因為執行了查詢和更新，即使無實際修改。
  */
  await User.updateOne(
    {
      /*
      尋找_id為req.params.id (要追蹤的用戶)並且
      followers陣列的user屬性中不包含req.user.id的文檔
      */
      _id: req.params.id,
      "followers.user": {$ne: req.user.id}
    },
    {
      // 在following陣列添加user屬性為req.user.id的物件
      $addToSet: {followers: {user: req.user.id}}
    }
  );
  res.status(200).json({
    status: "success",
    message: "您已成功追蹤!"
  });
}))


// 設置路由器取消追蹤一位朋友
router.delete("/:id/unfollow", isAuth, handleErrorAsync(async function(req, res, next){

  /*
  雖然req.user物件包含的是_id
  {
    _id: new ObjectId("1233211234567"),
    name: '小咪',
    following: [],
    followers: [],
  }
  而Mongoose會自動生成id屬性，其值為_id屬性的字串表示。
  這個id屬性是一個虛擬屬性，透過console.log(req.user)時不會列出id屬性，
  除非顯式訪問console.log(req.user.id)。
  */
  if(req.params.id === req.user.id){
    return next(appError(401, "您無法取消追蹤自己", next));
  }

  /*
  updateOne()在不匹配任何文件情況下

  1. 查詢條件不匹配表示無需更新。
  2. 仍被視為成功，因為執行了查詢和更新，即使無實際修改。
  */
  await User.updateOne(
    {
      // 尋找當前用戶
      _id: req.user.id
    },
    {
      // 在following陣列移除user屬性為req.params.id的物件
      $pull: {following: {user: req.params.id}}
    }
  );

  /*
  updateOne()在不匹配任何文件情況下

  1. 查詢條件不匹配表示無需更新。
  2. 仍被視為成功，因為執行了查詢和更新，即使無實際修改。
  */
  await User.updateOne(
    {
      // 尋找要追蹤的用戶
      _id: req.params.id
    },
    {
      // 在followers陣列移除user屬性為req.user.id的物件
      $pull: {followers: {user: req.user.id}}
    }
  );
  res.status(200).json({
    status: "success",
    message: "您已成功取消追蹤!"
  });
}))


// 設定路由器取得個人追蹤名單
router.get("/following", isAuth, handleErrorAsync(async function(req, res, next){
  const currentUser = await User.findOne({_id: req.user.id}).populate({
    // 從following陣列引用物件的user屬性
    path: "following.user",
    select: "name"
  });
  const followingList = currentUser.following;
  res.status(200).json({
    status: "success",
    followingList
  })
}))

module.exports = router;
