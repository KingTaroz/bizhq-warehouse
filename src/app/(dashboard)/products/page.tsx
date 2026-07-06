import { getProducts, getDistinctOptions } from '@/app/actions/product'
import ProductClient from './ProductClient'
import { cookies } from 'next/headers'

export default async function ProductsPage() {
  const products = await getProducts();
  const options = await getDistinctOptions();
  
  const cookieStore = await cookies();
  const role = cookieStore.get('auth_role')?.value || 'warehouse';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">สินค้า & สต๊อก (Products & Stock)</h1>
        <p className="text-slate-400">Manage your product inventory and stock balances.</p>
      </div>
      <ProductClient initialProducts={products} options={options} role={role} />
    </div>
  );
}
