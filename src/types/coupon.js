/**
 * @typedef {'FIXED' | 'PERCENTAGE'} DiscountType
 */

/**
 * @typedef {Object} Coupon
 * @property {number} couponId
 * @property {string} couponCode
 * @property {DiscountType} discountType
 * @property {number} discountValue
 * @property {number | null} maxDiscountAmount
 * @property {string} startDate
 * @property {string} endDate
 * @property {number} minimumOrderAmount
 * @property {number} maxUsage
 * @property {number} maxUsagePerUser
 * @property {number} currentUsage
 * @property {boolean} deleted
 */

/**
 * @typedef {Object} CreateCouponRequest
 * @property {string} couponCode
 * @property {DiscountType} discountType
 * @property {number} discountValue
 * @property {number | null} maxDiscountAmount
 * @property {string} endDate
 * @property {number} minimumOrderAmount
 * @property {number} maxUsage
 * @property {number} maxUsagePerUser
 */

export const DISCOUNT_TYPES = Object.freeze({
  FIXED: 'FIXED',
  PERCENTAGE: 'PERCENTAGE',
})
