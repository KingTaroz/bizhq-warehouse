import { getAnalyticsOverview } from '@/app/actions/analytics'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const initialData = await getAnalyticsOverview('MONTH');

  return (
    <main className="p-4 sm:p-6 lg:p-8 ml-0 lg:ml-64 pt-20 lg:pt-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">วิเคราะห์กำไร-ขาดทุน (P&L Analytics)</h1>
          <p className="text-muted-foreground mt-1">สรุปยอดขาย ต้นทุน และกำไรจากออเดอร์ออนไลน์</p>
        </div>
        
        <AnalyticsClient initialData={initialData} />
      </div>
    </main>
  )
}
