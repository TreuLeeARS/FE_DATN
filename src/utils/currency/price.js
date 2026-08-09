export const formatVND = (price) => {
  if (price === undefined || price === null) return '0 VND';
  return new Intl.NumberFormat('vi-VN').format(price) + ' VND';
};
