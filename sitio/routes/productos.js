var express = require('express');
var router = express.Router();
const {productos, productoDetalle, administrador, agregar, editar} = require('../controllers/productoController')

/* GET home page. */
router.get('/administrador',administrador);
router.get('/categoria/:category', productos);
router.get('/detalle/:id', productoDetalle);
router.get('/agregar-productos', agregar);
router.get('/editar-productos', editar);


module.exports = router;