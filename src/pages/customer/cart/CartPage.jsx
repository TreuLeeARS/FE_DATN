import { useState, useLayoutEffect, useRef, useEffect, useCallback } from 'react'
import { formatVND } from '@/utils/currency/price.js'
import { Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import { Header } from '@/components/layout/Header/Header.jsx'
import { Footer } from '@/components/layout/Footer/Footer.jsx'
import { useCartContext } from '@/contexts/cart/CartContext.jsx'
import orderApi from '@/api/orders/orderApi.js'
import couponApi from '@/api/coupons/couponApi.js'
import paymentApi from '@/api/payments/paymentApi.js'
import userApi from '@/api/users/userApi.js'
import shippingApi from '@/api/shipping/shippingApi.js'
import informationApi from '@/api/information/informationApi.js'
import { AddressSelector } from '@/components/customer/cart/AddressSelector/AddressSelector.jsx'
import { DISCOUNT_TYPES } from '@/types/coupon.js'
import { replaceBrokenProductImage } from '@/utils/products/imageUrl.js'

const unwrapApiData = (response) => response?.data?.data ?? response?.data ?? response
// Số coupon tối đa tải về để tìm mã đã áp dụng trong giỏ hàng.
const COUPON_LOOKUP_FETCH_SIZE = 100
// Bật khi BE đã hỗ trợ thanh toán chuyển khoản ngân hàng.
const BANK_TRANSFER_ENABLED = false

const getMomoPayUrl = (response) => {
  const data = unwrapApiData(response)
  return data?.payUrl || data?.paymentUrl || data?.payment?.payUrl || data?.payment?.paymentUrl
}

const getPaymentMethodType = (method) => String(
  method?.paymentMethodType
  || method?.methodType
  || method?.paymentMethodName
  || method?.methodName
  || method?.code
  || method?.name
  || '',
).toUpperCase()

const getSavedAddressFirstName = (address) => address?.firstName || address?.fisrtName || ''

const getAddressTypeLabel = (typeAddress) => {
  const labels = {
    HOME: 'Nhà riêng',
    OFFICE: 'Văn phòng',
    OTHER: 'Địa chỉ khác',
  }
  return labels[String(typeAddress || '').toUpperCase()] || 'Địa chỉ đã lưu'
}

const toDeliveryInfo = (address) => ({
  fullName: [address?.lastName, getSavedAddressFirstName(address)].filter(Boolean).join(' ').trim(),
  phone: String(address?.phone || '').replace(/\s/g, '').replace(/^\+84/, '0'),
  addressLine: address?.addressLine || '',
  address: [address?.addressLine, address?.ward, address?.district, address?.province].filter(Boolean).join(', '),
  province: address?.province || '',
  district: address?.district || '',
  ward: address?.ward || '',
})

const toSavedAddressPayload = (form, typeAddress) => {
  const nameParts = String(form.fullName || '').trim().split(/\s+/).filter(Boolean)
  if (nameParts.length < 2) return null

  return {
    lastName: nameParts[0],
    firstName: nameParts.slice(1).join(' '),
    phone: String(form.phone || '').replace(/\s/g, ''),
    addressLine: String(form.addressLine || '').trim(),
    ward: String(form.ward || '').trim(),
    district: String(form.district || '').trim(),
    province: String(form.province || '').trim(),
    typeAddress,
  }
}

const sameSavedAddress = (address, form) => {
  const normalise = (value) => String(value || '').trim().toLocaleLowerCase('vi-VN')
  return normalise(address?.addressLine) === normalise(form.addressLine)
    && normalise(address?.ward) === normalise(form.ward)
    && normalise(address?.district) === normalise(form.district)
    && normalise(address?.province) === normalise(form.province)
    && normalise(address?.phone) === normalise(form.phone)
}

export const CartPage = () => {
  const navigate = useNavigate()
  const { cartItems, removeItem, updateQuantity, refreshCart } = useCartContext()

  const [selectedItemIds, setSelectedItemIds] = useState([])
  const [dbCoupon, setDbCoupon] = useState(null)
  const [promoInput, setPromoInput] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([])

  useEffect(() => {
    let isMounted = true

    const fetchPaymentMethods = async () => {
      try {
        const response = await paymentApi.getAllPaymentMethods()
        const data = unwrapApiData(response)
        const methods = Array.isArray(data) ? data : data?.content || []
        if (isMounted) setAvailablePaymentMethods(methods)
      } catch (error) {
        if (isMounted) setDeliveryInfoMode('new')
        console.error('Không thể tải phương thức thanh toán:', error)
        if (isMounted) setAvailablePaymentMethods([])
      }
    }

    fetchPaymentMethods()
    return () => {
      isMounted = false
    }
  }, [])

  const hasMomoPayment = availablePaymentMethods.some(method => getPaymentMethodType(method).includes('MOMO'))

  // Tải thông tin coupon thực tế từ cơ sở dữ liệu nếu có mã giảm giá được áp dụng
  useEffect(() => {
    const appliedPromo = sessionStorage.getItem('appliedPromoCode')
    if (appliedPromo) {
      const fetchCoupon = async () => {
        try {
          const res = await couponApi.getCoupons({ page: 0, size: COUPON_LOOKUP_FETCH_SIZE })
          if (res && res.data && res.data.content) {
            const found = res.data.content.find(
              c => c.couponCode.toLowerCase().trim() === appliedPromo.toLowerCase().trim()
            )
            if (found) {
              setDbCoupon(found)
            }
          }
        } catch (err) {
          console.error('Error fetching coupon info from DB:', err)
        }
      }
      fetchCoupon()
    } else {
      setDbCoupon(null)
    }
  }, [cartItems])

  // Kiểm tra đăng nhập, nếu chưa đăng nhập thì đẩy về trang đăng nhập
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      toast.error('Vui lòng đăng nhập để xem giỏ hàng và thực hiện thanh toán.')
      sessionStorage.setItem('authRedirectUrl', '/cart')
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  // Kiểm tra và khởi tạo sản phẩm được chọn thanh toán khi click "Mua Ngay"
  useEffect(() => {
    const checkoutOnlyName = sessionStorage.getItem('checkoutOnlyName')
    const checkoutOnlySize = sessionStorage.getItem('checkoutOnlySize')
    const checkoutOnlyColor = sessionStorage.getItem('checkoutOnlyColor')
    const checkoutOnlyProductId = sessionStorage.getItem('checkoutOnlyProductId')

    if (checkoutOnlyName) {
      const matched = cartItems.find(item => 
        item.name.toLowerCase() === checkoutOnlyName.toLowerCase() &&
        String(item.selectedSize).toUpperCase() === String(checkoutOnlySize || 'S').toUpperCase() &&
        (checkoutOnlyColor ? String(item.selectedColor).toLowerCase() === String(checkoutOnlyColor).toLowerCase() : true)
      )
      if (matched) {
        setSelectedItemIds([matched.id])
        sessionStorage.removeItem('checkoutOnlyName')
        sessionStorage.removeItem('checkoutOnlySize')
        sessionStorage.removeItem('checkoutOnlyColor')
        sessionStorage.removeItem('checkoutOnlyProductId')
        
        // Cuộn mượt mà đến form điền thông tin đặt hàng
        setTimeout(() => {
          const el = document.getElementById('checkout-section')
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 150)
      }
    } else if (checkoutOnlyProductId) {
      // Fallback cho giỏ hàng local cũ
      const matched = cartItems.find(item => String(item.id).split('-')[0] === String(checkoutOnlyProductId))
      if (matched) {
        setSelectedItemIds([matched.id])
        sessionStorage.removeItem('checkoutOnlyProductId')
        setTimeout(() => {
          const el = document.getElementById('checkout-section')
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 150)
      }
    }
  }, [cartItems])

  const handleToggleSelectItem = (id) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAll = () => {
    setSelectedItemIds(prev =>
      prev.length === cartItems.length ? [] : cartItems.map(item => item.id)
    )
  }

  // State thông tin nhận hàng
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
    address: '',
    province: '',
    district: '',
    ward: '',
    paymentMethod: 'cod', // 'cod' | 'bank'
  })
  const [deliveryInfoMode, setDeliveryInfoMode] = useState('default')
  const [defaultDeliveryInfo, setDefaultDeliveryInfo] = useState(null)
  const [isLoadingDefaultDeliveryInfo, setIsLoadingDefaultDeliveryInfo] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [isLoadingSavedAddresses, setIsLoadingSavedAddresses] = useState(true)
  const [savedAddressError, setSavedAddressError] = useState(null)
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState(null)
  const [saveNewAddress, setSaveNewAddress] = useState(false)
  const [newAddressType, setNewAddressType] = useState('HOME')

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setIsLoadingSavedAddresses(false)
      return undefined
    }

    const controller = new AbortController()
    const loadSavedAddresses = async () => {
      setSavedAddressError(null)
      try {
        const response = await informationApi.getMyInformation({ page: 0, size: 50, sort: 'id,desc' }, controller.signal)
        const data = unwrapApiData(response)
        setSavedAddresses(Array.isArray(data) ? data : data?.content || [])
      } catch (error) {
        if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
          console.error('Không thể tải sổ địa chỉ:', error)
          setSavedAddressError('Không thể tải sổ địa chỉ. Bạn vẫn có thể nhập địa chỉ mới.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingSavedAddresses(false)
      }
    }

    loadSavedAddresses()
    return () => controller.abort()
  }, [])

  // Tự động lấy tên và số điện thoại từ hồ sơ của tài khoản đã đăng nhập.
  useEffect(() => {
    const username = localStorage.getItem('username')
    const token = localStorage.getItem('accessToken')
    if (!token || !username) return undefined

    let isMounted = true

    const loadDefaultDeliveryInfo = async () => {
      try {
        const [profileResponse, ordersResponse] = await Promise.all([
          userApi.getUserByUsername(username),
          orderApi.getMyOrders({ page: 0, size: 1, sort: 'orderId,desc' }),
        ])
        if (!isMounted) return

        const profile = unwrapApiData(profileResponse)
        const ordersData = unwrapApiData(ordersResponse)
        const latestOrder = Array.isArray(ordersData)
          ? ordersData[0]
          : ordersData?.content?.[0]
        if (!profile) return

        const fullName = [profile.lastName, profile.firstName]
          .filter(Boolean)
          .join(' ')
          .trim()
        const phone = String(profile.phone || '')
          .replace(/\s/g, '')
          .replace(/^\+84/, '0')

        const defaultInfo = {
          fullName: latestOrder?.fullName || fullName,
          phone: String(latestOrder?.phone || phone)
            .replace(/\s/g, '')
            .replace(/^\+84/, '0'),
          address: latestOrder?.shippingAddress || '',
          province: latestOrder?.province || '',
          district: latestOrder?.district || '',
          ward: latestOrder?.ward || '',
        }

        setDefaultDeliveryInfo(defaultInfo)

        setForm(previous => ({
          ...previous,
          fullName: previous.fullName || defaultInfo.fullName,
          phone: previous.phone || defaultInfo.phone,
          addressLine: previous.addressLine || '',
          address: previous.address || defaultInfo.address,
          province: previous.province || defaultInfo.province,
          district: previous.district || defaultInfo.district,
          ward: previous.ward || defaultInfo.ward,
        }))

        if (!defaultInfo.address || !defaultInfo.province || !defaultInfo.district || !defaultInfo.ward) {
          setDeliveryInfoMode('new')
        }
      } catch (error) {
        console.error('Không thể tự động tải thông tin người nhận:', error)
      } finally {
        if (isMounted) setIsLoadingDefaultDeliveryInfo(false)
      }
    }

    loadDefaultDeliveryInfo()
    return () => {
      isMounted = false
    }
  }, [])

  const hasDefaultDeliveryInfo = Boolean(
    defaultDeliveryInfo?.fullName
    && defaultDeliveryInfo?.phone
    && defaultDeliveryInfo?.address
    && defaultDeliveryInfo?.province
    && defaultDeliveryInfo?.district
    && defaultDeliveryInfo?.ward,
  )

  const selectedSavedAddress = savedAddresses.find(
    (address) => String(address.id) === String(selectedSavedAddressId),
  )
  const isUsingSavedAddress = deliveryInfoMode === 'saved' && Boolean(selectedSavedAddress)
  const isUsingDefaultAddress = deliveryInfoMode === 'default' && hasDefaultDeliveryInfo
  const isEnteringNewAddress = !isUsingSavedAddress && !isUsingDefaultAddress

  const applySavedAddress = (address) => {
    const deliveryInfo = toDeliveryInfo(address)
    setSelectedSavedAddressId(address.id)
    setDeliveryInfoMode('saved')
    setSaveNewAddress(false)
    setForm(previous => ({ ...previous, ...deliveryInfo }))
    setErrors({})
  }

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderInfo, setOrderInfo] = useState(null)

  // CRIT-03 FIX: Ref-based guard chống double-submit (state-based có race window)
  const isSubmittingRef = useRef(false)

  const pageRef = useRef(null)

  // GSAP animation cho trang giỏ hàng
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.cart-anim-item', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }, pageRef)
    return () => ctx.revert()
  }, [orderSuccess])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!form.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên người nhận'
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại'
    } else if (!/^(0[3|5|7|8|9])[0-9]{8}$/.test(form.phone.trim())) {
      newErrors.phone = 'Số điện thoại không đúng định dạng (phải có 10 chữ số)'
    }

    if (!form.address.trim()) {
      newErrors.address = 'Vui lòng chọn đầy đủ tỉnh, quận/huyện, phường/xã và nhập địa chỉ nhận hàng'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const selectedItems = cartItems.filter(item => selectedItemIds.includes(item.id))
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const [shippingQuote, setShippingQuote] = useState({ fee: null, loading: false, error: false })

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) {
      toast.error('Vui lòng nhập mã giảm giá!')
      return
    }
    if (selectedItemIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một sản phẩm để áp dụng mã giảm giá!')
      return
    }
    try {
      setPromoLoading(true)
          const res = await couponApi.getCoupons({ page: 0, size: COUPON_LOOKUP_FETCH_SIZE })
      if (res && res.data && res.data.content) {
        const found = res.data.content.find(
          c => c.couponCode.toLowerCase().trim() === promoInput.toLowerCase().trim()
        )
        if (found) {
          if (selectedTotal >= found.minimumOrderAmount) {
            sessionStorage.setItem('appliedPromoCode', found.couponCode)
            setDbCoupon(found)
            setPromoInput('')
          } else {
            toast.error(`Đơn hàng chưa đạt giá trị tối thiểu ${formatVND(found.minimumOrderAmount)} để áp dụng mã này!`)
          }
        } else {
          toast.error('Mã giảm giá không tồn tại hoặc đã hết hạn!')
        }
      } else {
        toast.error('Không thể kiểm tra mã giảm giá lúc này.')
      }
    } catch (err) {
      console.error('Error applying coupon:', err)
      toast.error(
        err.response?.data?.message
        || err.response?.data?.data?.message
        || 'Đã xảy ra lỗi khi áp dụng mã giảm giá.'
      )
    } finally {
      setPromoLoading(false)
    }
  }

  const handleRemovePromo = () => {
    sessionStorage.removeItem('appliedPromoCode')
    setDbCoupon(null)
    toast.success('Đã gỡ mã giảm giá.')
  }

  // Backend là nguồn quyết định số tiền giảm thực tế khi checkout.
  const appliedPromo = sessionStorage.getItem('appliedPromoCode')

  const estimatedCouponDiscount = (() => {
    if (!appliedPromo || !dbCoupon) return 0
    if (selectedTotal < Number(dbCoupon.minimumOrderAmount || 0)) return 0

    const discountValue = Number(dbCoupon.discountValue || 0)
    if (!Number.isFinite(discountValue) || discountValue <= 0) return 0

    if ((dbCoupon.discountType || DISCOUNT_TYPES.FIXED) === DISCOUNT_TYPES.PERCENTAGE) {
      const percentageDiscount = Math.round(selectedTotal * discountValue / 100)
      const maxDiscount = Number(dbCoupon.maxDiscountAmount)
      const cappedDiscount = Number.isFinite(maxDiscount) && maxDiscount > 0
        ? Math.min(percentageDiscount, maxDiscount)
        : percentageDiscount
      return Math.min(selectedTotal, cappedDiscount)
    }

    return Math.min(selectedTotal, discountValue)
  })()

  // CRIT-06 FIX: Phí vận chuyển ước tính — server sẽ quyết định giá trị cuối cùng
  useEffect(() => {
    let isCurrent = true

    if (selectedItemIds.length === 0 || selectedTotal <= 0 || !form.address.trim()) {
      setShippingQuote({ fee: null, loading: false, error: false })
      return () => {
        isCurrent = false
      }
    }

    const calculateShippingFee = async () => {
      setShippingQuote(previous => ({ ...previous, loading: true, error: false }))
      try {
        const response = await shippingApi.calculate({
          subtotalAmount: selectedTotal,
          province: form.province,
          district: form.district,
          ward: form.ward,
          shippingAddress: form.address,
        })
        const data = unwrapApiData(response)
        const fee = Number(data?.shippingFee)

        if (!Number.isFinite(fee) || fee < 0) {
          throw new Error('Phí vận chuyển backend trả về không hợp lệ.')
        }
        if (isCurrent) setShippingQuote({ fee, loading: false, error: false })
      } catch (error) {
        console.error('Không thể tính phí vận chuyển:', error)
        if (isCurrent) setShippingQuote({ fee: null, loading: false, error: true })
      }
    }

    calculateShippingFee()
    return () => {
      isCurrent = false
    }
  }, [selectedItemIds.length, selectedTotal, form.address, form.province, form.district, form.ward])

  // Phí vận chuyển chỉ dùng giá BE trả về; BE vẫn quyết định giá cuối khi checkout.
  const estimatedShippingFee = shippingQuote.fee ?? 0
  const estimatedTotalAfterCoupon = Math.max(
    0,
    selectedTotal - estimatedCouponDiscount + estimatedShippingFee,
  )

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()

    // CRIT-03 FIX: Chặn double-submit bằng ref (không bị race condition như state)
    if (isSubmittingRef.current) return
    
    if (!validateForm()) {
      toast.error('Vui lòng điền đầy đủ và chính xác thông tin giao hàng!')
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      // Giỏ hàng đã được đồng bộ qua useCart hook, tiến hành checkout trực tiếp

      // CRIT-02 FIX: Gửi danh sách cartItemIds đã chọn thay vì checkout toàn bộ giỏ
      const paymentMethodType = form.paymentMethod === 'cod'
        ? 'COD'
        : form.paymentMethod === 'momo'
          ? 'MOMO'
          : null

      if (!paymentMethodType) {
        toast.error('Chuyển khoản ngân hàng hiện chưa được hỗ trợ.')
        return
      }

      const checkoutData = {
        cartItemIds: selectedItemIds,
        fullName: form.fullName,
        phone: form.phone,
        address: form.address,
        province: form.province,
        district: form.district,
        ward: form.ward,
        couponCode: appliedPromo || null,
        paymentMethodType,
      }

      // 1. Tạo đơn hàng trên backend
      if (deliveryInfoMode === 'new' && saveNewAddress && !savedAddresses.some((address) => sameSavedAddress(address, form))) {
        const savedAddressPayload = toSavedAddressPayload(form, newAddressType)
        if (!savedAddressPayload?.addressLine) {
          toast.error('Vui lòng nhập họ tên và địa chỉ chi tiết hợp lệ để lưu địa chỉ.')
        } else {
          try {
            const savedAddressResponse = await informationApi.createInformation(savedAddressPayload)
            const savedAddress = unwrapApiData(savedAddressResponse)
            if (savedAddress?.id) {
              setSavedAddresses((current) => [savedAddress, ...current])
              setSelectedSavedAddressId(savedAddress.id)
              setSaveNewAddress(false)
            }
          } catch (saveError) {
            console.error('Không thể lưu địa chỉ:', saveError)
            toast.error('Đơn hàng vẫn được tạo, nhưng chưa thể lưu địa chỉ này.')
          }
        }
      }

      const res = await orderApi.checkout(checkoutData)

      if (paymentMethodType === 'MOMO') {
        const checkoutResponseData = unwrapApiData(res)
        const payUrl = getMomoPayUrl(res)

        if (checkoutResponseData?.orderId) {
          sessionStorage.setItem('momoOrderId', String(checkoutResponseData.orderId))
        }

        if (!payUrl) {
          throw new Error('Backend chưa trả về đường dẫn thanh toán MoMo.')
        }

        localStorage.setItem('momoPayUrl', payUrl)
        toast.success('Đang chuyển sang cổng thanh toán MoMo...')
        window.location.assign(payUrl)
        return
      }

      if (res && res.data) {
        const orderData = unwrapApiData(res)
        
        // 2. Nếu là COD, thực hiện tạo thanh toán COD tương ứng
        if (form.paymentMethod === 'cod') {
          await paymentApi.createCodPayment({
            orderId: orderData.orderId,
            amount: orderData.totalAmount
          })
        }
        
        // Cấu trúc dữ liệu hiển thị — sử dụng totalAmount từ server (source of truth)
        const mappedOrderInfo = {
          orderId: orderData.orderId,
          fullName: form.fullName,
          phone: form.phone,
          address: orderData.shippingAddress,
          paymentMethod: form.paymentMethod,
          total: orderData.totalAmount, // Server-authoritative total
          items: orderData.items?.map(item => ({
            id: item.productVariantId,
            name: item.productName,
            price: item.unitPrice,
            quantity: item.quantity,
            selectedSize: item.size,
            selectedColor: item.color,
            images: ['https://placehold.co/600x600/faf8f6/a3a3c2?text=No+Image']
          })) || [],
          couponCode: orderData.couponCode || appliedPromo || null,
          discount: Number(orderData.discountAmount ?? orderData.discountValue ?? 0),
          shippingFee: orderData.shippingFee || 0
        }

        setOrderInfo(mappedOrderInfo)
        setOrderSuccess(true)
        
        // Xóa giỏ hàng local và reload giỏ hàng từ backend
        await refreshCart()
        setSelectedItemIds([])
        sessionStorage.removeItem('appliedPromoCode')
        toast.success('Đặt đơn hàng thành công!')
      }
    } catch (err) {
      console.error('Lỗi khi thanh toán đơn hàng:', err)
      const errorMsg = err.response?.data?.message
        || err.response?.data?.data?.message
        || err.response?.data?.error
        || 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại.'
      toast.dismiss()
      toast.error(errorMsg, { id: 'checkout-error' })
      // Tự động đồng bộ lại giỏ hàng từ backend nếu có sản phẩm hết hạn giữ hàng
      try {
        await refreshCart()
      } catch (e) {
        console.error('Lỗi khi làm mới giỏ hàng:', e)
      }
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }, [selectedItemIds, form, appliedPromo, refreshCart, validateForm])

  return (
    <>
      <Header />

      <main ref={pageRef} className="pt-28 min-h-screen bg-brand-cream pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Màn hình ĐẶT HÀNG THÀNH CÔNG */}
          {orderSuccess && orderInfo ? (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center cart-anim-item">
              {/* Checkmark Icon */}
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 animate-pulse-subtle border border-green-100">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="font-display text-3xl font-bold text-brand-charcoal mb-2">
                Đặt Hàng Thành Công!
              </h2>
              <p className="text-brand-muted text-sm mb-6 leading-relaxed">
                Cảm ơn bạn đã lựa chọn mua sắm tại <span className="font-semibold text-brand-charcoal">OUTTA</span>. 
                Đơn hàng của bạn đã được ghi nhận và đang chờ xử lý giao nhận.
              </p>

              {/* Order Invoice Details */}
              <div className="bg-brand-cream/50 rounded-xl p-5 text-left border border-gray-200/50 mb-8 flex flex-col gap-3">
                <div className="flex justify-between border-b border-gray-200/60 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-muted">Mã đơn hàng:</span>
                  <span className="text-sm font-bold text-brand-charcoal">{orderInfo.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-brand-muted">Người nhận:</span>
                  <span className="text-sm font-semibold text-brand-charcoal">{orderInfo.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-brand-muted">Số điện thoại:</span>
                  <span className="text-sm font-semibold text-brand-charcoal">{orderInfo.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-brand-muted">Địa chỉ nhận hàng:</span>
                  <span className="text-sm font-semibold text-brand-charcoal text-right max-w-[280px] break-words">{orderInfo.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-brand-muted">Phương thức thanh toán:</span>
                  <span className="text-sm font-semibold text-brand-charcoal">
                    {orderInfo.paymentMethod === 'cod'
                      ? 'Thanh toán khi nhận hàng (COD)'
                      : orderInfo.paymentMethod === 'momo'
                        ? 'Ví điện tử MoMo'
                        : 'Chuyển khoản ngân hàng'}
                  </span>
                </div>
                {orderInfo.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span className="text-xs">
                      Giảm giá{orderInfo.couponCode ? ` (${orderInfo.couponCode})` : ''}:
                    </span>
                    <span className="text-sm font-semibold">-{formatVND(orderInfo.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200/60 pt-3 font-semibold">
                  <span className="text-sm text-brand-charcoal">Tổng cộng:</span>
                  <span className="text-base text-brand-charcoal">{formatVND(orderInfo.total)}</span>
                </div>
              </div>

              {/* Bank Transfer Guide Box */}
              {orderInfo.paymentMethod === 'bank' && (
                <div className="mb-8 p-5 bg-brand-blush/10 rounded-xl border border-brand-blush/40 text-left animate-slide-up">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-brand-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-brand-charcoal text-sm uppercase tracking-wider">Thông tin chuyển khoản:</span>
                  </div>
                  <ul className="text-xs text-brand-charcoal flex flex-col gap-1.5 leading-relaxed">
                    <li>• Ngân hàng: <span className="font-bold">MB Bank (Ngân hàng Quân đội)</span></li>
                    <li>• Số tài khoản: <span className="font-bold text-sm tracking-wide text-brand-charcoal">0398123456</span></li>
                    <li>• Chủ tài khoản: <span className="font-bold">LE MINH TRIEU</span></li>
                    <li>• Nội dung chuyển khoản: <span className="font-bold text-brand-charcoal bg-white px-2 py-0.5 border border-brand-blush rounded">{orderInfo.orderId}</span></li>
                  </ul>
                  <p className="text-[10px] text-brand-muted mt-3 italic">
                    * Lưu ý: Vui lòng chuyển khoản đúng nội dung và số tiền trên để đơn hàng được duyệt tự động nhanh nhất.
                  </p>
                </div>
              )}

              <Link to="/" className="btn-primary inline-block py-3 px-8 rounded-lg text-sm tracking-wider">
                Tiếp tục mua sắm
              </Link>
            </div>
          ) : cartItems.length === 0 ? (
            /* Giỏ hàng trống */
            <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 p-12 text-center cart-anim-item">
              <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-6 text-brand-muted">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-bold text-brand-charcoal mb-3">
                Giỏ hàng của bạn trống
              </h2>
              <p className="text-brand-muted text-sm mb-8 max-w-xs mx-auto">
                Hiện chưa có sản phẩm nào trong giỏ hàng. Hãy lướt xem bộ sưu tập và chọn những món đồ bạn yêu thích nhé!
              </p>
              <Link to="/" className="btn-primary inline-block py-3 px-8 rounded-lg text-sm tracking-wider">
                Quay lại mua sắm
              </Link>
            </div>
          ) : (
            /* Giỏ hàng có sản phẩm, hiển thị giao diện đặt hàng */
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              
              {/* ═══════════ LEFT COLUMN: SHIPPING FORM OR PLACEHOLDER ═══════════ */}
              {selectedItemIds.length > 0 ? (
                <div id="checkout-section" className="w-full lg:w-3/5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm cart-anim-item animate-fade-in">
                  <h2 className="font-display text-2xl font-bold text-brand-charcoal mb-6 border-b border-gray-100 pb-4">
                    Thông tin giao hàng
                  </h2>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {isLoadingDefaultDeliveryInfo ? (
                      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-xs text-brand-muted">
                        Đang tải thông tin giao hàng mặc định...
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-muted">Chọn thông tin giao hàng</p>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              disabled={!hasDefaultDeliveryInfo || isSubmitting}
                              onClick={() => {
                                if (!defaultDeliveryInfo) return
                                setDeliveryInfoMode('default')
                                setSelectedSavedAddressId(null)
                                setSaveNewAddress(false)
                                setForm(previous => ({ ...previous, ...defaultDeliveryInfo }))
                                setErrors({})
                              }}
                              className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                deliveryInfoMode === 'default'
                                  ? 'border-brand-charcoal bg-brand-cream/30 ring-1 ring-brand-charcoal'
                                  : 'border-gray-200 hover:border-brand-charcoal/50'
                              }`}
                            >
                              <p className="text-sm font-semibold text-brand-charcoal">Thông tin mặc định</p>
                              <p className="mt-1 text-[11px] text-brand-muted">Dùng thông tin của đơn gần nhất.</p>
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => {
                                setDeliveryInfoMode('new')
                                setSelectedSavedAddressId(null)
                                setSaveNewAddress(false)
                                setForm(previous => ({
                                  ...previous,
                                  fullName: defaultDeliveryInfo?.fullName || previous.fullName,
                                  phone: defaultDeliveryInfo?.phone || previous.phone,
                                  addressLine: '',
                                  address: '',
                                  province: '',
                                  district: '',
                                  ward: '',
                                }))
                                setErrors({})
                              }}
                              className={`rounded-xl border p-4 text-left transition-colors ${
                                deliveryInfoMode === 'new'
                                  ? 'border-brand-charcoal bg-brand-cream/30 ring-1 ring-brand-charcoal'
                                  : 'border-gray-200 hover:border-brand-charcoal/50'
                              }`}
                            >
                              <p className="text-sm font-semibold text-brand-charcoal">Thông tin mới</p>
                              <p className="mt-1 text-[11px] text-brand-muted">Nhập người nhận và địa chỉ giao mới.</p>
                            </button>
                          </div>
                          {!hasDefaultDeliveryInfo && (
                            <p className="mt-2 text-[11px] text-amber-700">Chưa có địa chỉ mặc định đầy đủ. Vui lòng chọn thông tin mới.</p>
                          )}
                          <section className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-brand-cream/35 px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-charcoal text-white">
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
                                    <circle cx="12" cy="9" r="2.2" />
                                  </svg>
                                </span>
                                <div>
                                  <h3 className="text-sm font-semibold text-brand-charcoal">Địa chỉ đã lưu</h3>
                                  <p className="text-[11px] text-brand-muted">Chọn nhanh địa chỉ giao hàng cho đơn này</p>
                                </div>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-brand-muted shadow-sm">{savedAddresses.length} địa chỉ</span>
                            </div>

                            <div className="p-3">
                              {isLoadingSavedAddresses ? (
                                <div className="space-y-2 animate-pulse">
                                  <div className="h-4 w-32 rounded bg-gray-100" />
                                  <div className="h-12 rounded-lg bg-gray-100" />
                                </div>
                              ) : savedAddresses.length > 0 ? (
                                <div className="grid gap-2">
                                  {savedAddresses.map((savedAddress) => {
                                    const isSelected = isUsingSavedAddress && String(selectedSavedAddressId) === String(savedAddress.id)
                                    const savedDeliveryInfo = toDeliveryInfo(savedAddress)
                                    const addressTypeLabel = getAddressTypeLabel(savedAddress.typeAddress)
                                    return (
                                      <button
                                        key={savedAddress.id}
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => applySavedAddress(savedAddress)}
                                        className={`group relative rounded-xl border p-3.5 pr-12 text-left transition-all ${
                                          isSelected
                                            ? 'border-brand-charcoal bg-brand-cream/55 shadow-sm ring-1 ring-brand-charcoal'
                                            : 'border-gray-200 bg-white hover:border-brand-charcoal/60 hover:bg-brand-cream/20'
                                        }`}
                                      >
                                        <span className="mb-1.5 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-muted">{addressTypeLabel}</span>
                                        <span className="block text-xs font-semibold text-brand-charcoal">{savedDeliveryInfo.fullName || 'Người nhận'} <span className="font-normal text-brand-muted">· {savedDeliveryInfo.phone}</span></span>
                                        <span className="mt-1 block text-[11px] leading-relaxed text-brand-muted">{savedDeliveryInfo.address}</span>
                                        {isSelected && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm" aria-label="Đang chọn">Đang dùng</span>}
                                      </button>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-4 py-5 text-center">
                                  <p className="text-xs font-semibold text-brand-charcoal">Bạn chưa có địa chỉ đã lưu</p>
                                  <p className="mt-1 text-[11px] leading-relaxed text-brand-muted">Chọn “Thông tin mới”, nhập địa chỉ và tích “Lưu địa chỉ này” khi đặt hàng.</p>
                                </div>
                              )}
                              {savedAddressError && <p className="mt-2 text-[11px] text-amber-700">{savedAddressError}</p>}
                            </div>
                          </section>
                        </div>

                        {isUsingDefaultAddress ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-950 shadow-sm">
                            <p className="font-semibold">Thông tin giao hàng mặc định</p>
                            <p className="mt-2">{form.fullName} · {form.phone}</p>
                            <p className="mt-1 leading-relaxed">{form.address}</p>
                          </div>
                        ) : isUsingSavedAddress ? (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-950 shadow-sm">
                            <p className="font-semibold">Địa chỉ đã lưu</p>
                            <p className="mt-2">{form.fullName} · {form.phone}</p>
                            <p className="mt-1 leading-relaxed">{form.address}</p>
                          </div>
                        ) : (
                          <section className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5">
                            <div className="mb-5 flex items-start gap-3 border-b border-gray-200 pb-4">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-charcoal text-sm text-white">+</span>
                              <div>
                                <p className="text-sm font-semibold text-brand-charcoal">Nhập địa chỉ giao hàng mới</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-brand-muted">Thông tin này chỉ dùng cho đơn hàng hiện tại, trừ khi bạn chọn lưu lại.</p>
                              </div>
                            </div>
                    {/* Full Name */}
                    <div>
                      <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">
                        Họ và tên người nhận
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        id="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Nguyễn Văn A"
                        className="input-base"
                        disabled={isSubmitting}
                      />
                      {errors.fullName && (
                        <p className="text-red-400 text-xs mt-2 animate-slide-up">{errors.fullName}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">
                        Số điện thoại nhận hàng
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="09XXXXXXXX"
                        className="input-base"
                        disabled={isSubmitting}
                      />
                      {errors.phone && (
                        <p className="text-red-400 text-xs mt-2 animate-slide-up">{errors.phone}</p>
                      )}
                    </div>

                    {/* Enhanced Location & Address Selector */}
                    <AddressSelector
                      value={form.address}
                      onAddressChange={(addressDetails) => {
                        setForm(prev => ({
                          ...prev,
                          addressLine: addressDetails.addressLine,
                          address: addressDetails.shippingAddress,
                          province: addressDetails.province,
                          district: addressDetails.district,
                          ward: addressDetails.ward,
                        }))
                        if (errors.address) {
                          setErrors(prev => ({ ...prev, address: '' }))
                        }
                      }}
                      disabled={isSubmitting}
                      error={errors.address}
                    />
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-xs text-brand-charcoal">
                      <input
                        type="checkbox"
                        checked={saveNewAddress}
                        onChange={(event) => setSaveNewAddress(event.target.checked)}
                        disabled={isSubmitting}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-charcoal focus:ring-brand-charcoal"
                      />
                      <span className="flex-1">
                        <span className="font-semibold">Lưu địa chỉ này cho lần đặt hàng sau</span>
                        <span className="mt-0.5 block text-[11px] text-brand-muted">Địa chỉ sẽ được lưu vào sổ địa chỉ của tài khoản.</span>
                      </span>
                      {saveNewAddress && (
                        <select
                          value={newAddressType}
                          onChange={(event) => setNewAddressType(event.target.value)}
                          disabled={isSubmitting}
                          aria-label="Loại địa chỉ"
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px]"
                        >
                          <option value="HOME">Nhà riêng</option>
                          <option value="OFFICE">Văn phòng</option>
                          <option value="OTHER">Khác</option>
                        </select>
                      )}
                    </label>
                          </section>
                        )}
                      </>
                    )}

                    {/* Payment Method Selector */}
                    <div className="mt-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-3">
                        Phương thức thanh toán
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {/* COD option */}
                        <label
                          className={`flex-1 flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                            form.paymentMethod === 'cod'
                              ? 'border-brand-charcoal bg-brand-cream/30 ring-1 ring-brand-charcoal'
                              : 'border-gray-200 hover:border-brand-charcoal/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="cod"
                              checked={form.paymentMethod === 'cod'}
                              onChange={handleChange}
                              className="accent-brand-charcoal w-4 h-4"
                              disabled={isSubmitting}
                            />
                            <div className="text-left">
                              <p className="text-sm font-semibold text-brand-charcoal">Thanh toán khi nhận hàng (COD)</p>
                              <p className="text-[11px] text-brand-muted">Trả tiền mặt khi sản phẩm được giao đến nơi</p>
                            </div>
                          </div>
                        </label>

                        {/* MoMo option — chỉ hiển thị khi backend đã cấu hình */}
                        {hasMomoPayment && (
                          <label
                            className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                              form.paymentMethod === 'momo'
                                ? 'border-[#a50064] bg-[#fff0f7] ring-1 ring-[#a50064]'
                                : 'border-gray-200 hover:border-[#a50064]/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="momo"
                                checked={form.paymentMethod === 'momo'}
                                onChange={handleChange}
                                className="accent-[#a50064] w-4 h-4"
                                disabled={isSubmitting}
                              />
                              <div className="flex items-center gap-3 text-left">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#a50064] text-lg font-extrabold text-white">M</span>
                                <div>
                                  <p className="text-sm font-semibold text-brand-charcoal">Ví MoMo</p>
                                  <p className="text-[11px] text-brand-muted">Thanh toán online qua MoMo</p>
                                </div>
                              </div>
                            </div>
                          </label>
                        )}

                        {/* Bank option */}
                        <label
                          aria-disabled={!BANK_TRANSFER_ENABLED}
                          className={`flex-1 flex items-center justify-between p-4 border rounded-xl transition-all ${
                            form.paymentMethod === 'bank'
                              ? 'border-brand-charcoal bg-brand-cream/30 ring-1 ring-brand-charcoal'
                              : 'border-gray-200'
                          } ${BANK_TRANSFER_ENABLED ? 'cursor-pointer hover:border-brand-charcoal/50' : 'cursor-not-allowed opacity-45 grayscale'}`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="bank"
                              checked={form.paymentMethod === 'bank'}
                              onChange={handleChange}
                              className="accent-brand-charcoal w-4 h-4"
                              disabled={isSubmitting || !BANK_TRANSFER_ENABLED}
                            />
                            <div className="text-left">
                              <p className="text-sm font-semibold text-brand-charcoal">Chuyển khoản ngân hàng</p>
                              <p className="text-[11px] text-brand-muted">Chức năng đang được cập nhật</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Submit checkout Form hidden trigger */}
                    <input type="submit" id="checkout-form-submit" className="hidden" />
                  </form>
                </div>
              ) : (
                <div className="w-full lg:w-3/5 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center py-16 cart-anim-item flex flex-col items-center justify-center min-h-[350px] animate-fade-in">
                  <div className="w-16 h-16 bg-brand-cream rounded-full flex items-center justify-center mb-5 text-brand-muted">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-display text-xl font-bold text-brand-charcoal mb-2">
                    Chưa chọn sản phẩm thanh toán
                  </h3>
                  <p className="text-brand-muted text-sm max-w-sm leading-relaxed">
                    Vui lòng tích chọn sản phẩm bạn muốn đặt mua ở danh sách bên cạnh để nhập thông tin giao hàng và thanh toán.
                  </p>
                </div>
              )}

              {/* ═══════════ RIGHT COLUMN: CART ITEMS & SUMMARY ═══════════ */}
              <div className="w-full lg:w-2/5 flex flex-col gap-6 cart-anim-item">
                
                {/* Cart list summary card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                    <h3 className="font-display text-xl font-bold text-brand-charcoal">
                      Đơn hàng của bạn
                    </h3>
                    {cartItems.length > 0 && (
                      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-muted cursor-pointer hover:text-brand-charcoal transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.length === cartItems.length}
                          onChange={handleToggleSelectAll}
                          className="accent-brand-charcoal w-3.5 h-3.5"
                          disabled={isSubmitting}
                        />
                        Chọn tất cả
                      </label>
                    )}
                  </div>

                  {/* Cart items list */}
                  <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-4 mb-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center">
                        {/* Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => handleToggleSelectItem(item.id)}
                          className="accent-brand-charcoal w-4.5 h-4.5 cursor-pointer rounded border-gray-300 flex-shrink-0"
                          disabled={isSubmitting}
                          aria-label={`Chọn sản phẩm ${item.name}`}
                        />

                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg bg-gray-50 flex-shrink-0"
                          onError={replaceBrokenProductImage}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display text-sm font-bold text-brand-charcoal truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-1.5">
                            Size {item.selectedSize || 'Chưa chọn'}
                            <span className="text-gray-300">|</span>
                            {item.selectedColorHex && (
                              <span
                                className="inline-block w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                                style={{ backgroundColor: item.selectedColorHex }}
                              />
                            )}
                            {item.selectedColor || 'Chưa chọn màu'}
                          </p>
                          
                          {/* Price and controls */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-semibold text-brand-charcoal text-sm">
                              {formatVND(item.price)}
                            </span>

                            {/* Quantity control */}
                            <div className="flex items-center border border-gray-200 rounded-lg bg-brand-cream/20">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="px-2 py-0.5 text-xs text-brand-muted hover:text-brand-charcoal font-bold"
                                disabled={isSubmitting}
                              >
                                -
                              </button>
                              <span className="px-2 text-xs font-semibold text-brand-charcoal">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="px-2 py-0.5 text-xs text-brand-muted hover:text-brand-charcoal font-bold"
                                disabled={isSubmitting}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => {
                            removeItem(item.id);
                            setSelectedItemIds(prev => prev.filter(id => id !== item.id));
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0 transition-colors"
                          disabled={isSubmitting}
                          title="Xóa sản phẩm"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Application Box */}
                  <div className="border-t border-gray-100 pt-4 pb-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">
                      Mã giảm giá (Coupon)
                    </label>
                    {appliedPromo ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                        <div>
                          <span className="font-mono text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                            {appliedPromo}
                          </span>
                          {dbCoupon && selectedTotal < dbCoupon.minimumOrderAmount && (
                            <p className="text-[10px] text-red-500 mt-1.5 font-medium">
                              Chưa đạt tối thiểu {formatVND(dbCoupon.minimumOrderAmount)}
                            </p>
                          )}
                          {dbCoupon && selectedTotal >= dbCoupon.minimumOrderAmount && (
                            <p className="text-[10px] text-green-700 mt-1.5 font-medium">
                              {(dbCoupon.discountType || DISCOUNT_TYPES.FIXED) === DISCOUNT_TYPES.PERCENTAGE
                                ? `Giảm ${Number(dbCoupon.discountValue)}%${dbCoupon.maxDiscountAmount ? `, tối đa ${formatVND(dbCoupon.maxDiscountAmount)}` : ''}`
                                : `Giảm ${formatVND(dbCoupon.discountValue)}`}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          Gỡ mã
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nhập mã giảm giá..."
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          className="flex-1 input-base py-2 text-xs uppercase"
                          disabled={promoLoading || isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={handleApplyPromo}
                          disabled={promoLoading || isSubmitting || selectedItemIds.length === 0}
                          className="bg-brand-charcoal text-white hover:bg-brand-dark px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          {promoLoading ? '...' : 'Áp dụng'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Calculations */}
                  <div className="border-t border-gray-100 pt-4 flex flex-col gap-2.5 text-sm">
                    <div className="flex justify-between text-brand-muted">
                      <span>Tạm tính:</span>
                      <span className="font-semibold text-brand-charcoal">{formatVND(selectedTotal)}</span>
                    </div>

                    {estimatedCouponDiscount > 0 && (
                      <div className="flex justify-between text-green-700 font-medium">
                        <span>Giảm giá dự kiến ({appliedPromo}):</span>
                        <span>-{formatVND(estimatedCouponDiscount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-brand-muted">
                      <span>Phí vận chuyển <span className="text-[10px]">(ước tính)</span>:</span>
                      <span className="font-semibold text-brand-charcoal">
                        {selectedItemIds.length === 0
                          ? '0 VND'
                          : shippingQuote.loading
                            ? 'Đang tính...'
                            : shippingQuote.error
                              ? 'Chưa xác định'
                              : estimatedShippingFee === 0
                                ? 'Miễn phí'
                                : formatVND(estimatedShippingFee)}
                      </span>
                    </div>
                    
                    {shippingQuote.error && selectedItemIds.length > 0 && (
                      <p className="text-[10px] text-brand-muted italic text-left">
                        * Chưa thể tính phí vận chuyển. Backend sẽ xác nhận khi đặt hàng.
                      </p>
                    )}

                    <div className="border-t border-gray-150 pt-3 flex justify-between font-bold text-base text-brand-charcoal">
                      <span>Tổng cộng dự kiến:</span>
                      <span>{formatVND(selectedItemIds.length === 0 ? 0 : estimatedTotalAfterCoupon)}</span>
                    </div>
                    {appliedPromo && (
                      <p className="text-[10px] text-brand-muted italic text-left">
                        * Tổng tiền chính thức vẫn được Backend xác nhận khi đặt hàng.
                      </p>
                    )}
                  </div>

                  {/* Submit checkout CTA button */}
                  <button
                    onClick={() => {
                      if (selectedItemIds.length === 0) {
                        toast.error('Vui lòng chọn ít nhất một sản phẩm để thanh toán!')
                        return
                      }
                      document.getElementById('checkout-form-submit').click()
                    }}
                    disabled={isSubmitting || selectedItemIds.length === 0}
                    className={`auth-submit-btn w-full py-4 rounded-lg
                               font-semibold uppercase tracking-widest text-sm mt-6
                               transition-all duration-300
                               ${selectedItemIds.length === 0 
                                 ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                 : 'bg-brand-charcoal text-white hover:bg-brand-dark hover:shadow-xl hover:shadow-brand-charcoal/20 active:scale-[0.98]'}
                               disabled:opacity-60`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-3">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Đang tạo đơn hàng...
                      </span>
                    ) : (
                      'Xác nhận đặt hàng'
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      <Footer />
    </>
  )
}
