const multer = require("multer");
const path = require("path");
// upload是multer middleware的實例，協助我們將前端的上傳檔案包裝為物件
const upload = multer({
    limits: {
        fileSize: 2 * 1024 * 1024, // 限制上傳檔案不能超過2MB
    },
    fileFilter(req, file, cb){
        const ext = path.extname(file.originalname).toLowerCase(); // 取出上傳檔案的副檔名並小寫化
        if(ext !== ".jpg" && ext !== ".png" && ext !== ".jpeg"){
            /*
            當multer捕獲到錯誤時，它會將錯誤傳遞給Express的下一個錯誤處理middleware。
            在路由中使用了handleErrorAsync包裝非同步處理函式，因此這個錯誤會被傳遞給handleErrorAsync。
            */
            return cb(new Error("檔案格式錯誤，僅限上傳 jpg、jpeg 與 png 格式。"));
        }
        /*
        cb用來控制是否接受檔案的上傳。
        cb接受兩個參數，第一個參數是error，第二個參數是布林值(是否要接受該檔案)。

        接受檔案的情況：cb(null, true)

        自訂錯誤的情況：cb(new Error("自訂錯誤訊息"))
        */
        cb(null, true); // 若通過檢查則接受該檔案的上傳
    }
}).any(); // 接受一切上傳的檔案，並以陣列形式保存在req.files

module.exports = upload