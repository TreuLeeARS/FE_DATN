import { cn } from '@/utils/common/cn.js'

export const ProductBadge = ({ type }) => {
  if (!type) return null

  const badgeClasses = {
    new: 'badge-new',
    sale: 'badge-sale',
    bestseller: 'badge-bestseller',
  }

  const labelMap = {
    new: 'Mới',
    sale: 'Giảm Giá',
    bestseller: 'Bán Chạy',
  }

  return (
    <div className={cn('badge', badgeClasses[type])}>
      {labelMap[type]}
    </div>
  )
}
