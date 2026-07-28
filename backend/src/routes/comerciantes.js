const express = require("express");
const router = express.Router();

const comerciantes = [

{
    id:1,
    nome:"Hotel Exemplo",
    categoria:"Hotel",
    cidade:"Porto de Galinhas",
    logo:"/assets/comerciantes/pousada-mar-azul-piscina.jpg"
},

{
    id:2,
    nome:"Restaurante Exemplo",
    categoria:"Restaurante",
    cidade:"Porto de Galinhas",
    logo:"/assets/comerciantes/restaurante-mar-azul.jpg"
},

{
    id:3,
    nome:"Passeio de Lancha",
    categoria:"Passeios",
    cidade:"Porto de Galinhas",
    logo:"/assets/comerciantes/passeio-lancha.jpg"
},

{
    id:4,
    nome:"Mergulho nos Corais",
    categoria:"Passeios",
    cidade:"Porto de Galinhas",
    logo:"/assets/comerciantes/mergulho-corais.jpg"
},

{
    id:5,
    nome:"Buggy nas Dunas",
    categoria:"Passeios",
    cidade:"Porto de Galinhas",
    logo:"/assets/comerciantes/buggy-dunas.jpg"
}

];

router.get("/", (req,res)=>{
    res.json(comerciantes);
});

module.exports = router;
