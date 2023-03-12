const jwt = require("jsonwebtoken");


module.exports = async (req, res, next) => {
  if(req.headers.authorization!=null){
    const token = req.headers.authorization.split(' ')[1];
    await extraerUsuario(res, token);
  }
  
  next();
};

const extraerUsuario = async (res, token) => {
  res.locals.user = null;
  if (token) {
    const decodedToken = await jwt.verify(token, "efe");
    console.log("EL TOKEN DECODE ES ",decodedToken);
    let username = decodedToken.username;

    res.locals.user = {username};
  }
};


