const express = require('express');
const router = express.Router();
const appError = require("../service/appError");
const handleErrorAsync = require("../service/handleErrorAsync");
const upload = require("../service/image");
const {v4:uuidv4} = require("uuid");
const firebaseAdmin = require("../service/firebase");
// 取得Firebase Storage的儲存桶，以便在這個桶中進行文件上傳等操作
const bucket = firebaseAdmin.storage().bucket();

const {isAuth,generateSendJWT} = require('../service/auth');

/*
當multer捕獲到錯誤時，它會將錯誤傳遞給Express的下一個錯誤處理middleware。
在路由中使用了handleErrorAsync包裝非同步處理函式，因此這個錯誤會被傳遞給handleErrorAsync。
*/
router.post("/file", isAuth, upload, handleErrorAsync(async (req, res, next)=>{
    if(req.files == undefined || !req.files.length){
        /* next()會進到下一個程式堆疊，
        若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
        return next(appError(400, "尚未上傳檔案", next));
    }
    // 取得上傳的檔案資訊列表裡面的第一個檔案
    const file = req.files[0];
    /*透過儲存桶在Firebase Storage中建立一個新的檔案，
    這個檔案將在images資料夾內以UUID以及相應附檔名儲存*/
    const blob = bucket.file(`images/${uuidv4()}.${file.originalname.split('.').pop()}`);
    // 建立一個寫入流，以便將數據寫入到Firebase Storage中的檔案
    const blobStream = blob.createWriteStream();

    // 監聽上傳狀態，當上傳完成時，會觸發finish事件
    blobStream.on("finish", ()=>{
        // 設定檔案的存取權限
        const config = {
            action: "read", // 表示生成一個可讀取的URL
            expires: "12-31-2500", // 表示這個URL的有效期限
        };
        // 取得檔案的簽名網址
        blob.getSignedUrl(config, (err, fileUrl)=>{
            res.send({
                fileUrl
            });
        });
    });

    // 監聽上傳狀態，當上傳過程發生錯誤時，會觸發error事件
    blobStream.on("error", (err)=>{
        res.status(500).send("上傳失敗");
    });

    /* 將上傳檔案的數據寫到流中，並結束寫入過程。
    file.buffer包含了上傳檔案的二進制數據*/
    blobStream.end(file.buffer);

}));

module.exports = router;