import mongoose from "mongoose";
import { generateSKU } from "../middlewares/sku.js";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sku: { type: String, default: "", unique: true },

    category: {
      type: String,
      // enum: ["sneakers", "boots", "heels", "sandals", "slippers", "shoes", "other"],
      default: "shoes"
    },

    gender: {
      type: String,
      enum: ["men", "women", "kids", "unisex"],
      default: "men",
    },
    sizes: {
      type: String,
      default: "---"
    },
    season: {
      type: String,
      enum: ["summer", "winter", "spring", "autumn", "all"],
      default: "all",
    },
    sold: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    material: { type: String, default: "Unknown" },
    mainImages: [String],
    isAvailable: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProductSchema.plugin(mongooseLeanVirtuals);

// ✅ SKU AVTOMATIK YARATISH (MUAMMONING ASOSI SHU EDI)
ProductSchema.pre("save", function (next) {
  if (this.isNew && (!this.sku || this.sku.trim() === "")) {
    this.sku = generateSKU();
  }
  next();
});



// findOneAndUpdate — isAvailable uchun
ProductSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.types || (update.$set && update.$set.types)) {
    const types = update.types || update.$set.types;

    if (Array.isArray(types)) {
      const totalCount = types.reduce((sum, t) => sum + (t.count || 0), 0);
      if (!update.$set) update.$set = {};
      update.$set.isAvailable = totalCount > 0;
    }
  }

  next();
});



ProductSchema.virtual("qrCode").get(function () {
  if (!this.sku) return null;

  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${this.sku}`;
});


export default mongoose.model("Product", ProductSchema);
