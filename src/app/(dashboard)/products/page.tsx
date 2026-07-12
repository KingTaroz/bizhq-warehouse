import { getProducts, getDistinctOptions } from '@/app/actions/product'
import ProductClient from './ProductClient'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export default async function ProductsPage() {
  const products = await getProducts();
  const options = await getDistinctOptions();
  
  const cookieStore = await cookies();
  const role = verifyToken(cookieStore.get('auth_token')?.value) || 'warehouse';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">สินค้า & สต๊อก (Products & Stock)</h1>
        <p className="text-muted-foreground">Manage your product inventory and stock balances.</p>
      </div>
      <ProductClient initialProducts={products} options={options} role={role} />
    </div>
  );
}
