// 模組化:將schema及model從主程式拆出來
const mongoose = require('mongoose')
/*
Schema定義MongoDB文件的結構與規則：
1.欄位的資料類型
2.欄位是否為必須
3.欄位的預設值
4.驗證規則
*/
const postSchema = new mongoose.Schema(
    {
      content: {
        type: String,
        // 設置trim:true以去除前後空格
        trim: true,
        // 透過陣列來顯示回饋訊息
        required: [true, 'Content 未填寫']
      },
      image: {
        type:String,
        default:"" // default是指若沒有填寫，預設所給的值
      },
      createdAt: {
        type: Date,
        // 使用Date.now作為函數引用，而非立即調用。若使用Date.now()將導致所有實例共享相同的創建時間
        default: Date.now, // default是指若沒有填寫，預設所給的值
        // select為false代表建立這個屬性，但不會被find()找出來而具保護效果
        // select作用範圍僅限於Node.js後端的查詢，對於其他非Node.js環境或工具可能不具有效性
        select: false
      },

      /*
      指定ObjectId引用的是User model的document。
      讓Post model的document與User model的document建立關聯
      */
      user: {
          // 表示這個欄位儲存的是其他document的ObjectId
          type: mongoose.Schema.ObjectId,
          // ref表示這個ObjectId引用自User model的document
          ref: "User", // 注意大小寫有差異
          // 設置trim:true以去除前後空格
          trim: true,
          // 透過陣列來顯示回饋訊息
          required: [true, '貼文姓名未填寫']
      },

      /*
      指定ObjectId引用的是User model的document。
      讓Post model的document與User model的document建立關聯
      */
      //likes是一個陣列的引用
      likes: [
        {
          // 表示這個欄位儲存的是其他document的ObjectId
          type: mongoose.Schema.ObjectId,
          // ref表示這個ObjectId引用自User model的document
          ref: "User" // 注意大小寫有差異
        }
      ]
    },
    
    {
      // 移除欄位__v (version key)
      versionKey: false,
      // 告訴Mongoose在將模型轉換為JSON或JavaScript物件時，應該包含虛擬欄位
      toJSON: {virtuals: true},
      toObject: {virtuals: true}
    }
);

/*
虛擬欄位 (virtual field)用來連接兩個不同的模型，是一種不會實際儲存在資料庫的屬性，而是根據其他欄位動態計算，避免將大量數據儲存在單一文件中。在保證數據完整性的同時，避免單個文件過大。

虛擬欄位設定步驟

1. 設定virtual欄位 (在model定義之前)
2. 設定toJSON、toObject (在schema的option參數設定)
3. 設定populate (選擇需要填充的項目)
*/

// comments是虛擬欄位的名稱
postSchema.virtual("comments", {
  // ref表示這個欄位引用自Comment model的document
  ref: "Comment",
  // 目標文件所要關聯的欄位
  foreignField: "post",
  // 本地文件所要關聯的欄位
  localField: "_id"
});

// 在mongoose中，model()允許將已定義好的schema整合為可操作的模型，具有與MongoDB互動的多種方法
// 習慣上model會用大寫
const Post = mongoose.model('Post', postSchema);

/*
model第一個參數是模型名稱，會自動對應到MongoDB的collection名稱
第二個參數是schema
第三個參數是強制對應的MongoDB的collection名稱(可不填)

第一個參數在進到MongoDB時，會因為要符合習慣而自動變更
全英文小寫
複數形式
Room => rooms
Study => studies
cookies => 因符合MongoDB習慣而無變化

若想要依照自己的collection名稱
方法1：在 model() 的第三个參數中指定集合名稱
mongoose.model('ModelName', modelNameSchema, 'custom_collection_name');

方法2：在 mongoose.Schema() 的第二個參數中指定集合名稱 (寫死在schema)
new mongoose.Schema({ schema definition }, { collection: 'custom_collection_name' });
*/

module.exports = Post;
