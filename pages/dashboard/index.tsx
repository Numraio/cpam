import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { AccountLayout } from '@/components/layouts';

const Dashboard: NextPageWithLayout = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">CPAM Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Total Items</h2>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-gray-500">Portfolio items</p>
          </div>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Total Exposure</h2>
            <p className="text-3xl font-bold">$0</p>
            <p className="text-sm text-gray-500">Current value</p>
          </div>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Pending Approvals</h2>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-gray-500">Awaiting review</p>
          </div>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-sm">Last Calculation</h2>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-gray-500">Never</p>
          </div>
        </div>
      </div>

      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Welcome to CPAM! Start by adding items or configuring index series.</span>
      </div>
    </div>
  );
};

Dashboard.getLayout = function getLayout(page) {
  return <AccountLayout>{page}</AccountLayout>;
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { locale } = context;

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
};

export default Dashboard;
