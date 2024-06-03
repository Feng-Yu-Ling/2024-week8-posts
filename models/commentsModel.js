// 模組化:將schema及model從主程式拆出來
const mongoose = require("mongoose");
/*
Schema定義MongoDB文件的結構與規則：
1.欄位的資料類型
2.欄位是否為必須
3.欄位的預設值
4.驗證規則
*/
const commentSchema = new mongoose.Schema({
    comment: {
        type: String,
        // 透過陣列來顯示回饋訊息
        required: [true, "comment can not be empty!"]
    },
    createdAt: {
        type: Date,
        // 使用Date.now作為函數引用，而非立即調用。若使用Date.now()將導致所有實例共享相同的創建時間
        default: Date.now // default是指若沒有填寫，預設所給的值
    },

    /*
    指定ObjectId引用的是User model的document。
    讓Comment model的document與User model的document建立關聯
    */
    user: {
        // 表示這個欄位儲存的是其他document的ObjectId
        type: mongoose.Schema.ObjectId,
        // ref表示這個ObjectId引用自User model的document
        ref: "User", // 注意大小寫有差異
        // 透過陣列來顯示回饋訊息
        required: [true, "user must belong to a post."]
    },

    /*
    指定ObjectId引用的是Post model的document。
    讓Comment model的document與Post model的document建立關聯
    */
    post: {
        // 表示這個欄位儲存的是其他document的ObjectId
        type: mongoose.Schema.ObjectId,
        // ref表示這個ObjectId引用自Post model的document
        ref: "Post", // 注意大小寫有差異
        // 透過陣列來顯示回饋訊息
        required: [true, "comment must belong to a post."]
    }
});


/*
定義一個pre middleware，在每次查詢前先進行預填充。

/^find/: 表示所有find開頭的操作方法
this: 表示當下的查詢物件

在所有find查詢中都能自動填充完整的user資訊，而不需要手動指定
*/
commentSchema.pre(/^find/, function(next){
    this.populate({
        // path指向要填充(populate)的欄位為"user"
        path: "user",
        // select表示關聯查詢後要顯示的欄位為"name"及"createdAt"
        select: "name createdAt"
    });

    next();
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;