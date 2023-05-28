const express = require('express')
const { 
    createUser, 
    loginUser, 
    logoutUser,
    getallUser, 
    getaUser,
    deleteaUser,
    updateaUser,
    blockUser,
    unblockUser,
    handlerRefreshToken,
    updatePassword,
    forgotPasswordToken,
    resetPassword,
    loginAdmin,
    getWishlist,
    saveAddress,
    userCart,
    getUserCart,
    emptyCart,
    applyCoupon,
    createOrder,
    getOrders,
    getAllOrders,
    getOrderByUserId,
    updateOrderStatus
} = require('../controller/userController')
const { 
    authMiddleware,
    isAdmin
} = require('../middlewares/authMiddleware')
const router = express.Router()

//Router
//Login/Logout/Register
router.post('/register', createUser)
router.post('/login', loginUser)
router.post('/admin-login', loginAdmin)
router.get('/refresh', handlerRefreshToken)
router.get('/logout', logoutUser)

//password handle
router.put('/password',authMiddleware, updatePassword)
router.post('/forgot-password-token', forgotPasswordToken)
router.put('/reset-password/:token', resetPassword)

//tác vụ của client
router.put('/edit-user', authMiddleware, updateaUser)
router.put('/save-address', authMiddleware, saveAddress)
router.get('/wishlist', authMiddleware, getWishlist)

//Xử lý giỏ hàng
router.post('/cart', authMiddleware, userCart)
router.get('/cart', authMiddleware, getUserCart)
router.delete('/empty-cart', authMiddleware, emptyCart)
router.post('/cart/applycoupon', authMiddleware, applyCoupon)

//Xử lý đặt hàng/ hóa đơn
router.post("/cart/cash-order", authMiddleware, createOrder);
router.get("/get-orders", authMiddleware, getOrders);
router.post("/getorderbyuser/:id", authMiddleware, getOrderByUserId);

//admin xử lý order
router.get("/getallorders", authMiddleware, isAdmin, getAllOrders);
router.put("/order/update-order/:id", authMiddleware, isAdmin, updateOrderStatus);

//admin CRUD user
router.get('/all-users', getallUser)
router.get('/:id', authMiddleware, isAdmin, getaUser)
router.delete('/:id', deleteaUser)
router.put('/block-user/:id',authMiddleware, isAdmin, blockUser)
router.put('/unblock-user/:id',authMiddleware, isAdmin, unblockUser)

module.exports = router