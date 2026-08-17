import { useEffect, useState } from 'react'

const getLocationName = (location) => location?.full_name || location?.name || ''

export const AddressSelector = ({ value, onAddressChange, disabled, error }) => {
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [wards, setWards] = useState([])

  const [selectedProvince, setSelectedProvince] = useState(null)
  const [selectedDistrict, setSelectedDistrict] = useState(null)
  const [selectedWard, setSelectedWard] = useState(null)
  const [streetAddress, setStreetAddress] = useState('')

  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true)
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false)
  const [isLoadingWards, setIsLoadingWards] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadProvinces = async () => {
      setIsLoadingProvinces(true)
      try {
        const response = await fetch('https://esgoo.net/api-tinhthanh/1/0.htm')
        const data = await response.json()
        if (isMounted && data.error === 0 && Array.isArray(data.data)) {
          setProvinces(data.data)
        }
      } catch (fetchError) {
        console.error('Không thể tải danh sách Tỉnh/Thành:', fetchError)
      } finally {
        if (isMounted) setIsLoadingProvinces(false)
      }
    }

    loadProvinces()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedProvince?.id) {
      setDistricts([])
      setSelectedDistrict(null)
      setWards([])
      setSelectedWard(null)
      return undefined
    }

    let isMounted = true
    const loadDistricts = async () => {
      setIsLoadingDistricts(true)
      try {
        const response = await fetch(`https://esgoo.net/api-tinhthanh/2/${selectedProvince.id}.htm`)
        const data = await response.json()
        if (isMounted && data.error === 0 && Array.isArray(data.data)) {
          setDistricts(data.data)
        }
      } catch (fetchError) {
        console.error('Không thể tải danh sách Quận/Huyện:', fetchError)
      } finally {
        if (isMounted) setIsLoadingDistricts(false)
      }
    }

    loadDistricts()
    return () => {
      isMounted = false
    }
  }, [selectedProvince])

  useEffect(() => {
    if (!selectedDistrict?.id) {
      setWards([])
      setSelectedWard(null)
      return undefined
    }

    let isMounted = true
    const loadWards = async () => {
      setIsLoadingWards(true)
      try {
        const response = await fetch(`https://esgoo.net/api-tinhthanh/3/${selectedDistrict.id}.htm`)
        const data = await response.json()
        if (isMounted && data.error === 0 && Array.isArray(data.data)) {
          setWards(data.data)
        }
      } catch (fetchError) {
        console.error('Không thể tải danh sách Phường/Xã:', fetchError)
      } finally {
        if (isMounted) setIsLoadingWards(false)
      }
    }

    loadWards()
    return () => {
      isMounted = false
    }
  }, [selectedDistrict])

  const addressDetails = {
    addressLine: streetAddress.trim(),
    shippingAddress: [
      streetAddress.trim(),
      getLocationName(selectedWard),
      getLocationName(selectedDistrict),
      getLocationName(selectedProvince),
    ].filter(Boolean).join(', '),
    province: getLocationName(selectedProvince),
    district: getLocationName(selectedDistrict),
    ward: getLocationName(selectedWard),
  }

  const isComplete = Boolean(
    streetAddress.trim()
    && addressDetails.province
    && addressDetails.district
    && addressDetails.ward,
  )

  useEffect(() => {
    if (isComplete) {
      onAddressChange(addressDetails)
    } else if (value !== '') {
      onAddressChange({ addressLine: '', shippingAddress: '', province: '', district: '', ward: '' })
    }
  }, [
    isComplete,
    value,
    addressDetails.shippingAddress,
    addressDetails.province,
    addressDetails.district,
    addressDetails.ward,
  ])

  const handleProvinceSelect = (event) => {
    const province = provinces.find((item) => String(item.id) === event.target.value)
    setSelectedProvince(province || null)
    setSelectedDistrict(null)
    setSelectedWard(null)
  }

  const handleDistrictSelect = (event) => {
    const district = districts.find((item) => String(item.id) === event.target.value)
    setSelectedDistrict(district || null)
    setSelectedWard(null)
  }

  const handleWardSelect = (event) => {
    const ward = wards.find((item) => String(item.id) === event.target.value)
    setSelectedWard(ward || null)
  }

  return (
    <div className="space-y-3.5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <span className="text-base">🚚</span>
        <label className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
          Địa chỉ nhận hàng chi tiết
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        <select
          required
          value={selectedProvince?.id || ''}
          onChange={handleProvinceSelect}
          disabled={disabled || isLoadingProvinces}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium focus:border-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-charcoal"
        >
          <option value="">
            {isLoadingProvinces ? '-- Đang tải Tỉnh/Thành... --' : '-- Chọn Tỉnh / Thành --'}
          </option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {getLocationName(province)}
            </option>
          ))}
        </select>

        <select
          required
          value={selectedDistrict?.id || ''}
          onChange={handleDistrictSelect}
          disabled={disabled || !selectedProvince || isLoadingDistricts}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium focus:border-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-charcoal disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">
            {isLoadingDistricts ? '-- Đang tải Quận/Huyện... --' : '-- Chọn Quận / Huyện / TP --'}
          </option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {getLocationName(district)}
            </option>
          ))}
        </select>

        <select
          required
          value={selectedWard?.id || ''}
          onChange={handleWardSelect}
          disabled={disabled || !selectedDistrict || isLoadingWards}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium focus:border-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-charcoal disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">
            {isLoadingWards ? '-- Đang tải Phường/Xã... --' : '-- Chọn Phường / Xã --'}
          </option>
          {wards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {getLocationName(ward)}
            </option>
          ))}
        </select>
      </div>

      <input
        required
        type="text"
        value={streetAddress}
        onChange={(event) => setStreetAddress(event.target.value)}
        disabled={disabled}
        placeholder="Số nhà, tên đường"
        className="input-base py-2.5 text-xs shadow-sm focus:ring-2 focus:ring-brand-charcoal/20"
      />

      {isComplete && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/90 bg-emerald-50/90 p-3 text-xs text-emerald-900 shadow-sm">
          <span className="text-base">🏠</span>
          <div className="flex-1">
            <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wider text-emerald-950">
              Địa chỉ hoàn chỉnh dùng để giao hàng:
            </span>
            <span className="text-xs font-semibold leading-relaxed text-emerald-900">
              {addressDetails.shippingAddress}
            </span>
          </div>
        </div>
      )}

      {error && <p className="mt-1 animate-slide-up text-xs text-red-400">{error}</p>}
    </div>
  )
}
