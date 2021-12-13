const fs = require('fs');
const path = require('path');
const categorias = require('../data/categorias');
let products = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'productos.json'), 'utf-8'))
const db = require('../database/models')
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { send } = require('process');

module.exports = {
    productos: (req, res) => {

        db.Category.findAll({
            include: [{ all: true }],
            where: {
                name: { [Op.like]: req.params.category }
            }
        }).then(categorias => {

            db.Product.findAll(
                {
                    include: [
                        "colors",
                        "size",
                        "category",
                        "images"
                    ]
                }
            ).then(productos => {

                let producto = productos.filter(producto => producto.category.name === categorias[0].name)

                return res.render('vista-productos', {
                    products: producto,
                    title: req.params.category
                })

            }).catch(error => console.log(error))

        }).catch(error => console.log(error))



    },
    productoDetalle: (req, res) => {

        let productoPromise = db.Product.findByPk(req.params.id, {
            include: [
                "colors",
                "size",
                "category",
                "images"
            ],
        })

        let mochilasPromise =
            db.Category.findAll({
                include: ['products'],
                where: {
                    id: 1
                }
            })

        Promise.all([productoPromise, mochilasPromise])
            .then(([productoPromise, mochilasPromise]) => {
                let mochilas = mochilasPromise.map(mochila => mochila.products);

                //return res.send(productoPromise)

                return res.render('detalle', {
                    product: productoPromise,
                    mochilas,
                    colors: productoPromise.colors,
                    sizes: productoPromise.size
                })
            }).catch(error => console.log(error))

    },
    administrador: (req, res) => {
        db.Product.findAll({
            include: [
                "colors",
                "size",
                "category",
                "images"
            ]
        }).then(productos => {
            return res.send(productos)
            return res.render('administrador', {
                products: productos,
            })
        }).catch(error => console.log(error))
    },
    store: (req, res) => {
        let errores = validationResult(req);

        if (errores.isEmpty()) {
            const { name, category, price, description } = req.body;
            //res.send(req.body)
            db.Product.create({
                name: name.trim(),
                price: +price,
                description: description.trim(),
                categoryId: category
            }).then(producto => {
                if (req.file != undefined) {
                    let images =  {
                            file: req.file.filename,
                            productId: producto.id
                    }

                    db.Image.create(images)
                        .then(() => console.log('imagenes agregadas')).catch(error => console.log(error))
                } 
                

                let colores = req.body.color.map(color => {
                    let colorMap = {
                        colorId: +color,
                        productId: +producto.id
                    }
                    return colorMap;
                })

                let talles = req.body.talle.map(size => {
                    let talleMap = {
                        sizeId: +size,
                        productId: +producto.id
                    }
                    return talleMap;
                })

                let coloresPromise = db.ColorProduct.bulkCreate(colores)

                let tallesPromise = db.SizeProduct.bulkCreate(talles)

                Promise.all([coloresPromise, tallesPromise]).then(() => {

                    

                    
                    
                    res.redirect('/productos/administrador')
                }).catch(error => console.log(error))
            }).catch(error => console.log(error))
        } else {
            let colores = db.Color.findAll()

            let talles = db.Size.findAll()

            let categorias = db.Category.findAll()

            Promise.all(([colores, talles, categorias])).then(([colores, talles, categorias]) => {
                //res.send(req.body)
                errores = errores.mapped();

                if (req.fileValidationError) {
                    errores = {
                        ...errores,
                        image: {
                            msg: req.fileValidationError
                        }
                    }
                }
                return res.render('agregar-productos', {
                    errores: errores,
                    old: req.body,
                    colores,
                    talles,
                    categorias
                })
            }).catch(error => console.log(error))
        }
    },
    editar: (req, res) => {

        let producto = db.Product.findByPk(req.params.id, {
            include: [
                "colors",
                "size",
                "category"
            ],
        })

        let colores = db.Color.findAll()

        let talles = db.Size.findAll()

        let categorias = db.Category.findAll()


        Promise.all([producto, colores, talles, categorias])
            .then(([producto, colores, talles, categorias]) => {
                //res.send(producto)
                return res.render('editar-productos', {
                    producto,
                    colores,
                    talles,
                    categorias
                })
            }).catch(error => console.log(error))
    },
    actualizar: (req, res) => {

        let errores = validationResult(req);

        if (errores.isEmpty()) {
            let { name, price, description, category } = req.body;

            db.Product.findByPk(req.params.id, {
                include: [
                    "colors",
                    "size",
                    "category"
                ]
            }).then(producto => {

                let colores;
                if (req.body.color.length > 0) {
                    colores = req.body.color.map(color => {
                        let colorMap = {
                            colorId: +color,
                            productId: +producto.id
                        }
                        return colorMap;
                    })
                } else {
                    colores = []
                }


                let talles;
                if (req.body.talle.length > 0) {
                    talles = req.body.talle.map(size => {
                        let talleMap = {
                            sizeId: +size,
                            productId: +producto.id
                        }
                        return talleMap;
                    })
                } else {
                    talles = []
                }


                db.ColorProduct.destroy({
                    where: {
                        productId: producto.id
                    }
                }).then(() => {
                    db.ColorProduct.bulkCreate(colores)
                })

                db.SizeProduct.destroy({
                    where: {
                        productId: producto.id
                    }
                }).then(() => {
                    db.SizeProduct.bulkCreate(talles)
                })

                db.Product.update({
                    name: name.trim(),
                    price: +price,
                    description: description.trim(),
                    categoryId: category,
                    image: req.file ? req.file.filename : producto.image
                },
                    {
                        where: {
                            id: req.params.id
                        }
                    }
                ).then(() => {
                    return res.redirect('/productos/detalle/' + req.params.id)
                })
            }).catch(error => console.log(error))
        } else {
            let colores = db.Color.findAll()

            let talles = db.Size.findAll()

            let categorias = db.Category.findAll()

            Promise.all(([colores, talles, categorias])).then(([colores, talles, categorias]) => {
                //res.send(req.body)
                db.Product.findByPk(req.params.id, {
                    include: [
                        "colors",
                        "size",
                        "category"
                    ],
                }).then(producto => {
                    return res.render('editar-productos', {
                        errores: errores.mapped(),
                        producto,
                        old: req.body,
                        colores,
                        talles,
                        categorias
                    })
                })

            }).catch(error => console.log(error))
        }
    },

    agregar: (req, res) => {
        let producto = db.Product.findByPk(req.params.id, {
            include: [
                "colors",
                "size",
                "category"
            ],
        })

        let colores = db.Color.findAll()

        let talles = db.Size.findAll()

        let categorias = db.Category.findAll()


        Promise.all([producto, colores, talles, categorias])
            .then(([producto, colores, talles, categorias]) => {
                return res.render('agregar-productos', {
                    producto,
                    colores,
                    talles,
                    categorias
                })
            }).catch(error => console.log(error))
    },
    destroy: (req, res) => {

        db.Product.findByPk(req.params.id, {
            include: [
                "colors",
                "size",
                "category"
            ]
        })
            .then(producto => {
                fs.existsSync(path.join(__dirname, '../public/images/products', producto.image)) ? fs.unlinkSync(path.join(__dirname, '../public/images/products', producto.image)) : null;
                let eliminarColores = db.ColorProduct.destroy({
                    where: {
                        productId: req.params.id
                    }
                })

                let eliminarTalles = db.SizeProduct.destroy({
                    where: {
                        productId: req.params.id
                    }
                })

                let eliminarProducto = db.Product.destroy({
                    where: {
                        id: req.params.id
                    },
                    include: [
                        "colors",
                        "size"
                    ]
                })

                Promise.all(([eliminarColores, eliminarTalles, eliminarProducto])).then(() => {
                    return res.redirect('/productos/administrador')
                }).catch(error => console.log(error))
            })
            .catch(error => console.log(error))
    }


}
