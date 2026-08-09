import { resolveProductImageUrl } from '@/utils/products/imageUrl.js'

// Bộ ánh xạ tên màu sắc từ DB sang mã màu Hex cho giao diện thời trang cao cấp
const COLOR_HEX_MAP = {
  'trắng': '#FFFFFF',
  'đen': '#2C2C2C',
  'charcoal': '#2C2C2C',
  'charcoal (đen xám)': '#2C2C2C',
  'hồng': '#F2C4CE',
  'hồng blush': '#F2C4CE',
  'beige': '#E8D5B7',
  'be': '#E8D5B7',
  'nâu': '#8B7355',
  'nâu sáng': '#8B7355',
  'nâu đậm': '#5A4A42',
  'xám': '#8E8E93',
  'đỏ': '#FF3B30',
  'xanh dương': '#3B82F6',
  'blue': '#3B82F6',
  'xanh': '#3A7D44',
  'vàng': '#E0A96D'
};

// Ánh xạ danh mục tiếng Việt từ BE sang slug tiếng Anh của FE
const CATEGORY_SLUG_MAP = {
  'váy & đầm': 'dresses',
  'váy': 'dresses',
  'đầm': 'dresses',
  'áo': 'tops',
  'áo thun': 'tops',
  'áo sơ mi': 'tops',
  'quần': 'bottoms',
  'quần tây': 'bottoms',
  'quần jeans': 'bottoms',
  'set đồ': 'sets',
  'set': 'sets',
  'áo khoác': 'outerwear',
  'giày': 'shoes',
  'túi xách': 'bags',
  'túi': 'bags',
  'phụ kiện': 'accessories'
};

// Hình ảnh thời trang mặc định khi sản phẩm không có ảnh
const DEFAULT_IMAGES = [
  'https://placehold.co/600x600/faf8f6/a3a3c2?text=No+Image'
];

/**
 * Chuyển tên màu sắc thành đối tượng chứa tên và mã Hex
 */
export const mapColor = (colorName) => {
  if (!colorName) return { name: 'Mặc định', hex: '#E8D5B7' };
  const cleanName = colorName.toLowerCase().trim();
  const hex = COLOR_HEX_MAP[cleanName] || COLOR_HEX_MAP['beige'];
  return { name: colorName, hex };
};

/**
 * Ánh xạ một đối tượng Product từ Backend sang định dạng Frontend mong đợi
 * @param {Object} dbProduct Đối tượng ProductListResponse hoặc ProductResponse từ API
 * @returns {Object} Đối tượng Product chuẩn hóa cho giao diện Frontend
 */
export const mapDbProduct = (dbProduct) => {
  if (!dbProduct) return null;

  const id = String(dbProduct.productId);
  const name = dbProduct.name || 'Sản phẩm không tên';
  const price = dbProduct.baseprice ? Number(dbProduct.baseprice) : 0;
  
  // BUG-FIX: Bỏ giảm giá giả lập và mác Sale mock không có trong database theo ý kiến sếp
  const originalPrice = null;
  const badge = null;

  // Chuẩn hóa ảnh
  let images = dbProduct.imageUrls;
  if (!images || !Array.isArray(images) || images.length === 0) {
    images = DEFAULT_IMAGES;
  } else {
    images = images.map(resolveProductImageUrl);
  }

  // Chuẩn hóa danh mục
  const dbCatName = (dbProduct.categoryName || '').toLowerCase().trim();
  let category = 'accessories';
  
  if (CATEGORY_SLUG_MAP[dbCatName]) {
    category = CATEGORY_SLUG_MAP[dbCatName];
  } else {
    // Tìm kiếm tương đối nếu danh mục có tên dài hơn
    for (const key of Object.keys(CATEGORY_SLUG_MAP)) {
      if (dbCatName.includes(key)) {
        category = CATEGORY_SLUG_MAP[key];
        break;
      }
    }
  }

  // Trích xuất màu sắc và kích cỡ từ variants nếu có (ProductResponse)
  let colors;
  let sizes;

  if (dbProduct.variants && Array.isArray(dbProduct.variants)) {
    if (dbProduct.variants.length > 0) {
      // Lấy kích cỡ độc nhất
      sizes = [...new Set(dbProduct.variants.map(v => v.size).filter(Boolean))];
      
      // Lấy màu sắc độc nhất
      const uniqueColors = [...new Set(dbProduct.variants.map(v => v.color).filter(Boolean))];
      colors = uniqueColors.map(colorName => mapColor(colorName));
    } else {
      // Sản phẩm thực sự không có biến thể nào trong DB
      colors = [];
      sizes = [];
    }
  } else {
    // Fallback mặc định cho ProductListResponse để hiển thị ngay trên lưới
    colors = [
      { name: 'Beige', hex: '#E8D5B7' },
      { name: 'Charcoal (Đen Xám)', hex: '#2C2C2C' },
      { name: 'Trắng', hex: '#FFFFFF' }
    ];
    sizes = ['S', 'M', 'L', 'XL'];
  }

  return {
    id,
    productId: dbProduct.productId,
    name,
    price,
    originalPrice,
    images,
    category,
    categoryId: dbProduct.categoryId,
    categoryName: dbProduct.categoryName,
    tags: dbProduct.description ? dbProduct.description.split(' ').slice(0, 3).map(w => w.replace(/[.,/#!$%^&*;:{}=_`~()-]/g,"")) : ['elegant', 'minimalist', 'premium'],
    badge,
    colors,
    sizes,
    isAvailable: !dbProduct.deleted,
    description: dbProduct.description || `Sản phẩm ${name} cao cấp mang phong cách thiết kế tối giản, chất liệu bền bỉ và phom dáng chuẩn mực.`,
    variants: dbProduct.variants || []
  };
};
