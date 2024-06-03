const handleErrorAsync = function handleErrorAsync(func) {

    /*將async function丟進參數，回傳有加catch版本的middleware，用來處理異步操作的錯誤*/

    // func 先將 async fun 帶入參數儲存
    // middleware 先接住 router 資料
    return function (req, res, next) {
        //再執行函式，並增加 catch 條件去捕捉
        // async 本身就是 promise，所以可用 catch 去捕捉異步函式錯誤
        func(req, res, next).catch(
            function (error) {
                /* next()會進到下一個程式堆疊，
                若next()裡面放Error作為參數，則會進到express的錯誤處理middleware*/
                return next(error);
            }
        );
    };
};

/*
補充說明：

這個函式返回一個新的函式，這個新函式接收req,res,next作為參數。
當這個新函式被呼叫時，才會執行func。
如果func回傳一個Promise，這個Promise會被.catch捕捉到錯誤並傳遞給next。
*/

module.exports = handleErrorAsync;