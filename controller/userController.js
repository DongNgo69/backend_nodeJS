const { generateToken } = require('../config/jwtToken');
const { generateRefreshToken } = require('../config/refreshToken');

//import model
const User = require('../models/userModel')
const Product = require('../models/productModel')
const Cart = require('../models/cartModel')
const Order = require('../models/orderModel')
const Coupon = require('../models/couponModel')

const asyncHandler = require('express-async-handler');
const validateMongoDBId = require('../utils/validateMongodbId');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const uniqid = require('uniqid') //tạo id thập lục phân
const { sendEmail } = require('./emailController')
//register
const createUser = asyncHandler(async (req, res) => {
    const email = req.body.email
    const findUser = await User.findOne({ email: email })
    if (!findUser) {
        const newUser = User.create(req.body)
        res.json(newUser)
    } else {
        throw new Error("Email người dùng đã tồn tại")
    }
})

//login
const loginUser = asyncHandler(async (req, res) => {
    const {email, password} = req.body
    //check đăng nhập
    const findUser = await User.findOne({ email })
    if (findUser && (await findUser.isPasswordMatched(password))){
        const refreshToken = await generateRefreshToken(findUser?._id)
        const updateUser = await User.findByIdAndUpdate(
            findUser.id,
            {    
                refreshToken : refreshToken,
            }, {
                new: true
            }
        )
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge:72 * 60 * 60 * 1000
        })    
        res.json({
            _id: findUser?._id,
            fullname: findUser?.fullname,
            email: findUser?.email,
            mobile: findUser?.mobile,
            token: generateToken(findUser?._id),
    })
    } else {
        throw new Error("Thông tin không hợp lệ")
    }
})

// Xử lý refreshtoken
const handlerRefreshToken = asyncHandler( async (req, res) => {
    const cookie = req.cookies
    if(!cookie?.refreshToken) throw new Error("No refresh Token in Cookies")
    const refreshToken = cookie.refreshToken
    const user = await User.findOne({refreshToken})
    if (!user) throw new Error("No refresh Token in db or not matchesd")
    jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
        if(err || user.id !== decoded.id){
            throw new Error ("Có lỗi xảy ra khi refresh Token")
        }
        const accessToken = generateToken(user?._id)
        res.json({ accessToken })
    })
})

// login ADmin
const loginAdmin = asyncHandler(async (req, res) => {
    const {email, password} = req.body
    //check  admin đăng nhập
    const findAdmin = await User.findOne({ email })
    if (findAdmin.role !== "admin") throw new Error("Xác minh không thành công");
    if (findAdmin && (await findAdmin.isPasswordMatched(password))){
        const refreshToken = await generateRefreshToken(findAdmin?._id)
        const updateUser = await User.findByIdAndUpdate(
            findAdmin.id,
            {    
                refreshToken : refreshToken,
            }, {
                new: true
            }
        )
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge:72 * 60 * 60 * 1000
        })    
        res.json({
            _id: findAdmin?._id,
            fullname: findAdmin?.fullname,
            email: findAdmin?.email,
            mobile: findAdmin?.mobile,
            token: generateToken(findAdmin?._id),
    })
    } else {
        throw new Error("Thông tin không hợp lệ")
    }
})

//logout
const logoutUser = asyncHandler(async (req, res) => {
    const cookie = req.cookies
    if(!cookie?.refreshToken) throw new Error("No refresh Token in Cookies")
    const refreshToken = cookie.refreshToken
    const user = await User.findOne({ refreshToken })
    if(!user){
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: true
        })
        return res.sendStatus(204) //forbiden
    }
    await User.findOneAndUpdate({refreshToken}, {
        refreshToken: ""
    })
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true
    })
    res.sendStatus(204)
})

//Get all user
const getallUser = asyncHandler(async (req, res) => {
    try {
        const getUsers = await User.find().populate("wishlist")
        res.json(getUsers)
    } catch (e){
        throw new Error(e)
    }
})

//Get one user
const getaUser = asyncHandler(async (req, res) => {
    const { id } = req.params
    validateMongoDBId(id)
    try{
        const getUsers = await User.findById(id)
        res.json({
            getUsers
        })
    }catch(e){
        throw new Error(e)
    }
})

//DeleteUser
const deleteaUser = asyncHandler(async (req, res) => {
    const { id } = req.params
    validateMongoDBId(id)
    try{
        const deletedUser = await User.findByIdAndDelete(id)
        res.json({
            deletedUser
        })
    }catch(e){
        throw new Error(e)
    }
})

//UpdateUser by Client
const updateaUser = asyncHandler(async (req, res) => {
    const { _id } = req.user
    validateMongoDBId(_id)
    try{
        const updatedUser = await User.findByIdAndUpdate(
        _id,
         {
            fullname: req?.body.fullname,
            email: req?.body.email,
            mobile: req?.body.mobile,
        },
        {
            new: true,
        })
        res.json(updatedUser)
    } catch (e){
        throw new Error(e)
    }
})

//Block user
const blockUser = asyncHandler(async (req, res) => {
    const {id} = req.params
    validateMongoDBId(id)
    try {
        const blockUser = await User.findByIdAndUpdate(
            id, 
            {
                isBlocked:true,
            },
            {
                new:true,
            }
        )
        res.json(blockUser)
    }catch (e) {
        throw new Error(e);
    }
})

const unblockUser = asyncHandler(async (req, res) => {
    const {id} = req.params
    validateMongoDBId(id)
    try {
        const unblockUser = await User.findByIdAndUpdate(
            id, 
            {
                isBlocked:false,
            },
            {
                new:true,
            }
        )
        res.json(unblockUser)
    }catch (e) {
        throw new Error(e);
    }
})

//đổi mật khẩu
const updatePassword = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const {password} = req.body
    validateMongoDBId(_id)
    const user = await User.findById(_id)
    if (password) {
        user.password = password
        const updatePassword = await user.save()
        res.json(updatePassword)
    } else {
        res.json(user)
    }
})

const forgotPasswordToken = asyncHandler(async(req, res) => {
    const { email } = req.body
    const user = await User.findOne({ email })
    if(!user) throw new Error('Email không tồn tại trên hệ thống')
    try{
        const token = await user.createPasswordResetToken();
        await user.save()
        const resetURL = `Bấm vào link để đặt lại mật khẩu của bạn. Link sẽ vô hiệu sau 10 phút! 
                        <a href='http://localhost:5000/api/user/reset-password/${token}'>
                        Bấm vào đây</a>`
        const data = {
            to: email,
            text: "Hey User",
            subject: 'Link lấy lại mật khẩu.',
            htm: resetURL,
        }
        sendEmail(data)
        res.json(token)
    }catch (e){
        throw new Error(e)
    }
})

//quên mật khẩu
const resetPassword = asyncHandler(async (req, res) => {
    const {password} = req.body
    const { token } = req.params
    const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest("hex")
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: {
            $gt: Date.now()
        } 
    })
    if(!user) throw new Error('Token đã hết hạn, vui lòng thử lại')
    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()
    res.json(user)
})

//lấy danh sách wishlist
const getWishlist = asyncHandler(async (req, res) => {
    const { _id } = req.user
    try{
        const findUser = await User.findById(_id).populate('wishlist')
        res.json(findUser)
    } catch (e){
        throw new Error(e)
    }
})

//lưu địa chỉ người dùng
const saveAddress = asyncHandler(async (req, res) => {
    const { _id } = req.user
    validateMongoDBId(_id)
    try{
        const updateUser = await User.findByIdAndUpdate (
            _id,
            {
                address: req?.body?.address,
            },
            {
                new: true
            }
        )
        res.json(updateUser)
    } catch (e) {
        throw new Error(e)
    }
})
//xử lý giỏ hàng
const userCart = asyncHandler (async (req, res) => {
    const { cart } = req.body
    const { _id } = req.user
    validateMongoDBId(_id)
    try {
        let products = []
        const user = await User.findById(_id)
        //check xem trong giỏ hàng có sẵn đồ hay chưa
        const alreadyExistCart = await Cart.findOne({orderby: user._id})
        //nếu có thì xóa
        if (alreadyExistCart) {
            alreadyExistCart.remove()
        }
        for (let i = 0; i < cart.length; i++) {
            let object = {};
            object.product = cart[i]._id; // duyệt từng phần tử của bảng product đưa id vào product(con) của giá hàng
            object.count = cart[i].count;
            object.color = cart[i].color;
            //lấy giá từ product đưa vào cart id
            let getPrice = await Product.findById(cart[i]._id).select("price").exec();
            object.price = getPrice.price;
            //đẩy từng món hàng vào bảng products
            products.push(object);
          }
          //tính tổng gió giỏ hàng
          let cartTotal = 0;
          for (let i = 0; i < products.length; i++) {
            //duyệt qua từng sảng phẩm bằng giá sản phảm * số lượng
            cartTotal = cartTotal + products[i].price * products[i].count;
          }
          //xuất ra cart mới
        let newCart = await new Cart({
            products,
            cartTotal,
            orderby: user?._id,
        }).save();
        res.json(newCart);
    }catch (e){
        throw new Error(e)
    }
})

//xem giỏ hàng
const getUserCart = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    validateMongoDBId(_id);
    try {
        const cart = await Cart.findOne({ orderby: _id }).populate("products.product");
        res.json(cart);
    }  catch (e) {
        throw new Error(e);
    }
});

//xử giỏ thành giỏ hàng trống sau khi mua
const emptyCart = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    validateMongoDBId(_id);
    try {
        const user = await User.findOne({ _id });
        const cart = await Cart.findOneAndRemove({ orderby: user._id });
        res.json(cart);
    } catch (e) {
        throw new Error(e);
    }
  });
//áp mã giảm giá
const applyCoupon = asyncHandler(async (req, res) => {
    const { coupon } = req.body;
    const { _id } = req.user;
    validateMongoDBId(_id);
    const validCoupon = await Coupon.findOne({ name: coupon });//thay cái name bằng một cái mã random để ng dùng tự nhập
    if (validCoupon === null) {
        throw new Error('Mã giảm giá không hợp lệ');
    }
    const user = await User.findOne({ _id });
    let { cartTotal } = await Cart.findOne({
        orderby: user._id,
    }).populate('products.product');
    //tính giá sau khi giảm
    let totalAfterDiscount = (
        cartTotal -
        (cartTotal * validCoupon.discount) / 100
    ).toFixed(2);
    // cập nhật giả giảm lại vào giỏ hàng
    await Cart.findOneAndUpdate(
        { orderby: user._id },
        { totalAfterDiscount },
        { new: true }
    );
    res.json(totalAfterDiscount);
})
//đặt hàng
const createOrder = asyncHandler(async (req, res) => {
    const { COD, couponApplied } = req.body; // có mã giảm giá hay k
    const { _id } = req.user;
    validateMongoDBId(_id);
    try {
        if (!COD) throw new Error("Đặt hàng thất bại");
        const user = await User.findById(_id); //lấy thông tin user
        let userCart = await Cart.findOne({ orderby: user._id }) //lấy thông tin cart thông qua orderby
        let finalAmout = 0;
        if (couponApplied && userCart.totalAfterDiscount) {
            finalAmout = userCart.totalAfterDiscount; //giá cuối nếu có add coupon thì lấy giá từ hàm dùng coupon
        } else {
            finalAmout = userCart.cartTotal;// còn k dùng coupon thì lấy giá tổng bình thường
        }
        //tạo đơn hàng mới
        let newOrder = await new Order({
            products: userCart.products,
            paymentIntent: {
            id: uniqid(), // tạo id thập lục phần tránh tạo trùng lập id
            method: "COD", //chỉ có lựa chọn COD
            amount: finalAmout,
            status: "Thanh toán khi nhận hàng",
            created: Date.now(),
            currency: "Đồng",
            },
        orderby: user._id,
        orderStatus: "Thanh toán khi nhận hàng",
        }).save();
        //cập nhật lại số lượng trong product
        let update = userCart.products.map((item) => {
            return {
            updateOne: {
            filter: { _id: item.product._id }, //quét qua từng sản phẩm và update
            update: { $inc: { quantity: -item.count, sold: +item.count } },
          },
        };
      });
        const updated = await Product.bulkWrite(update, {});
        res.json({ message: "Thành công" });
    } catch (e) {
      throw new Error(e);
    }
})
const getOrders = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    validateMongoDBId(_id);
    try {
        const userorders = await Order.findOne({ orderby: _id })
            .populate("products.product") //lấy full thông tin sản phẩm
            .populate("orderby")//lấy full thông tin giỏ hàng
            .exec();//truy xuất dữ liệu
        res.json(userorders);
    } catch (e) {
      throw new Error(e);
    }
})
  
const getAllOrders = asyncHandler(async (req, res) => {
    try {
        const alluserorders = await Order.find()
            .populate("products.product")
            .populate("orderby")
            .exec();
        res.json(alluserorders);
    } catch (e) {
      throw new Error(e);
    }
})
const getOrderByUserId = asyncHandler(async (req, res) => {
    const { id } = req.params;
    validateMongoDBId(id);
    try {
        const userorders = await Order.findOne({ orderby: id })
            .populate("products.product")
            .populate("orderby")
            .exec();
         res.json(userorders);
    } catch (e) {
        throw new Error(e);
    }
})
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    validateMongoDBId(id);
    try {
        const updateOrderStatus = await Order.findByIdAndUpdate(
            id,
            {
            orderStatus: status, //chọn order status
            paymentIntent: {
                status: status, //bên trong status cũng cập nhật theo
            },
            },
            { new: true }
        );
        res.json(updateOrderStatus);
    } catch (e) {
      throw new Error(e);
    }
  });
module.exports = { 
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
}