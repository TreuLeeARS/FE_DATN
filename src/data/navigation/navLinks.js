export const navLinks = [
  { label: 'Trang chủ', href: '/' },
  {
    label: 'Quần áo',
    href: '/shop',
    sublinks: [
      { label: 'Áo', href: '/shop?category=%C3%81o' },
      { label: 'Quần', href: '/shop?category=Qu%E1%BA%A7n' },
      { label: 'Váy & Đầm', href: '/shop?category=V%C3%A1y%20%26%20%C4%90%E1%BA%A7m' },
      { label: 'Set đồ', href: '/shop?category=Set%20%C4%91%E1%BB%93' },
      { label: 'Áo khoác', href: '/shop?category=%C3%81o%20kho%C3%A1c' },
    ]
  },
  {
    label: 'Giày & Túi',
    href: '/shop',
    sublinks: [
      { label: 'Giày', href: '/shop?category=Gi%C3%A0y' },
      { label: 'Túi xách', href: '/shop?category=T%C3%BAi%20x%C3%A1ch' },
    ]
  },
  {
    label: 'Phụ kiện',
    href: '/shop?category=Ph%E1%BB%A5%20ki%E1%BB%87n',
    sublinks: [
      { label: 'Trang sức', href: '/shop?category=Trang%20s%E1%BB%A9c' },
      { label: 'Kính mắt', href: '/shop?category=K%C3%ADnh%20m%E1%BA%AFt' },
      { label: 'Thắt lưng', href: '/shop?category=Th%E1%BA%AFt%20l%C6%B0ng' },
      { label: 'Mũ & Nón', href: '/shop?category=M%C5%A9%20%26%20N%C3%B3n' },
    ]
  },
]

export const socialLinks = [
  {
    platform: 'Instagram',
    href: '#',
    icon: 'instagram',
  },
  {
    platform: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61591331740630',
    icon: 'facebook',
  },
  {
    platform: 'GitHub',
    href: '#',
    icon: 'github',
  },
  {
    platform: 'YouTube',
    href: '#',
    icon: 'youtube',
  },
]

export const footerLinks = [
  {
    heading: 'Mua Sắm',
    links: [
      { label: 'Hàng Mới', href: '/shop?filter=new' },
      { label: 'Đầm', href: '/shop?category=V%C3%A1y%20%26%20%C4%90%E1%BA%A7m' },
      { label: 'Áo', href: '/shop?category=%C3%81o' },
      { label: 'Quần & Chân Váy', href: '/shop?category=Qu%E1%BA%A7n' },
      { label: 'Áo Khoác', href: '/shop?category=%C3%81o%20kho%C3%A1c' },
    ],
  },
  {
    heading: 'Chăm Sóc Khách Hàng',
    links: [
      { label: 'Liên Hệ', href: '/contact' },
      { label: 'Thông Tin Vận Chuyển', href: '/shipping' },
      { label: 'Đổi Trả', href: '/returns' },
      { label: 'Câu Hỏi Thường Gặp', href: '/faq' },
    ],
  },
  {
    heading: 'Về Chúng Tôi',
    links: [
      { label: 'Giới Thiệu', href: '/about' },
      { label: 'Phát Triển Bền Vững', href: '/sustainability' },
      { label: 'Blog', href: '/blog' },
      { label: 'Tuyển Dụng', href: '/careers' },
    ],
  },
]
