import { useEffect, lazy } from 'react'
import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Header } from '@/components/layout/Header/index.js'
import { Hero } from '@/components/customer/home/Hero/index.js'
import { ProductGrid } from '@/components/customer/products/ProductGrid/index.js'
import { AIRecommendations } from '@/components/customer/products/AIRecommendations/index.js'

import { Footer } from '@/components/layout/Footer/index.js'
import { CartProvider } from '@/contexts/cart/CartContext.jsx'
import { AuthPage, ResetPasswordPage } from '@/pages/customer/auth/AuthPage/index.js'
import { ShopPage } from '@/pages/customer/products/ShopPage.jsx'
import { CartPage } from '@/pages/customer/cart/CartPage.jsx'
import { PaymentSuccessPage } from '@/pages/customer/payments/PaymentSuccessPage.jsx'
import { ShopPromptModal } from '@/components/customer/popups/ShopPromptModal/ShopPromptModal.jsx'
import { ErrorBoundary } from '@/components/common/ErrorBoundary.jsx'
import { NotFoundPage } from '@/pages/errors/NotFoundPage.jsx'
import { AboutPage } from '@/pages/customer/about/AboutPage.jsx'
import { InfoPage } from '@/pages/customer/info/InfoPage.jsx'
import { isAdminOnly } from '@/utils/auth/auth.js'

// Admin Panel Components & Pages (Lazy loaded for client performance)
import { AdminProtectedRoute } from '@/components/admin/common/AdminProtectedRoute.jsx'
import { AdminLayout } from '@/components/layout/AdminLayout.jsx'
import { MyOrders } from '@/pages/customer/orders/MyOrdersPage.jsx'
import { MyInvoices } from '@/pages/customer/invoices/MyInvoicesPage.jsx'
import { ProfilePage } from '@/pages/customer/profile/ProfilePage.jsx'

const AdminDashboard = lazy(() => import('@/pages/Admin/dashboard/AdminDashboardPage.jsx').then(m => ({ default: m.AdminDashboard })))
const CategoryManager = lazy(() => import('@/pages/Admin/categories/CategoryManagerPage.jsx').then(m => ({ default: m.CategoryManager })))
const ProductManager = lazy(() => import('@/pages/Admin/products/ProductManagerPage.jsx').then(m => ({ default: m.ProductManager })))
const OrderManager = lazy(() => import('@/pages/Admin/orders/OrderManagerPage.jsx').then(m => ({ default: m.OrderManager })))
const InvoiceManager = lazy(() => import('@/pages/Admin/invoices/InvoiceManagerPage.jsx').then(m => ({ default: m.InvoiceManager })))
const UserManager = lazy(() => import('@/pages/Admin/users/UserManagerPage.jsx').then(m => ({ default: m.UserManager })))
const CouponManager = lazy(() => import('@/pages/Admin/coupons/CouponManagerPage.jsx').then(m => ({ default: m.CouponManager })))
const PopupManager = lazy(() => import('@/pages/Admin/popups/PopupManagerPage.jsx').then(m => ({ default: m.PopupManager })))
const ActionLogManager = lazy(() => import('@/pages/Admin/actionLogs/ActionLogPage.jsx').then(m => ({ default: m.ActionLogPage })))

function App() {
  const location = useLocation()

  useEffect(() => {
    // Kiểm tra xem có yêu cầu cuộn trang nào được lưu trữ không
    const targetHash = sessionStorage.getItem('scrollTarget')
    if (targetHash && location.pathname === '/') {
      sessionStorage.removeItem('scrollTarget')
      // Đợi DOM render xong rồi mới thực hiện cuộn
      const timer = setTimeout(() => {
        const element = document.getElementById(targetHash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [location.pathname])

  return (
    <ErrorBoundary>
      <CartProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          containerStyle={{
            zIndex: 999999,
          }}
          toastOptions={{
            duration: 3500,
            style: {
              zIndex: 999999,
              borderRadius: '14px',
              background: '#0f172a',
              color: '#f8fafc',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#f43f5e',
                secondary: '#ffffff',
              },
            },
          }}
        />
        <Routes>
          {/* Landing Page */}
          <Route
            path="/"
            element={
              <>
                <Header />
                <main>
                  <div id="home"><Hero /></div>
                  <div id="collections">
                    <AIRecommendations />
                  </div>
                  <div id="sale">
                    <ProductGrid />
                  </div>
                </main>
                <Footer />
              </>
            }
          />

          {/* Auth Page (Login / Register) */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Reset Password Page */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Shop Page */}
          <Route path="/shop" element={<ShopPage />} />

          {/* Cart / Checkout Page */}
          <Route path="/cart" element={<CartPage />} />

          {/* MoMo Payment Return Page */}
          <Route path="/payment-success" element={<PaymentSuccessPage />} />

          {/* Customer Order History Page */}
          <Route path="/my-orders" element={<MyOrders />} />

          {/* Customer Invoice Lookup Page */}
          <Route path="/my-invoices" element={<MyInvoices />} />

          {/* Customer Profile Page */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* About us page */}
          <Route path="/about" element={<AboutPage />} />

          {/* Customer care and company information pages */}
          <Route path="/:page(contact|shipping|returns|faq|sustainability|blog|careers)" element={<InfoPage />} />

          {/* Admin Panel Route Group */}
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="categories" element={<CategoryManager />} />
            <Route path="products" element={<ProductManager />} />
            <Route path="orders" element={<OrderManager />} />
            <Route path="invoices" element={<InvoiceManager />} />
            <Route path="users" element={<UserManager />} />
            <Route path="coupons" element={<CouponManager />} />
            <Route path="popups" element={<PopupManager />} />
            <Route
              path="action-logs"
              element={isAdminOnly() ? <ActionLogManager /> : <Navigate to="/admin" replace />}
            />
          </Route>

          {/* IMP-01 FIX: Catch-all route to prevent blank page for invalid paths */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <ShopPromptModal />
      </CartProvider>
    </ErrorBoundary>
  )
}

export default App
