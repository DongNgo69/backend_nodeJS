const mongoose = require('mongoose'); // Erase if already required

// Declare the Schema of the Mongo model
var orderSchema = new mongoose.Schema(
    {
        products: [
          {
            product: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Product",
            },
            count: Number,
            color: String,
          },
        ],
        paymentIntent: {},
        orderStatus: {
          type: String,
          default: "Not Processed",
          enum: [
            "Chưa xử lý",
            "Thanh toán khi nhận hàng",
            "Đã tiếp nhận",
            "Đang giao hàng",
            "Giao thành công",
            "Đã hủy",
          ],
        },
        orderby: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
      {
        timestamps: true,
      }
    );

//Export the model
module.exports = mongoose.model('Order', orderSchema);