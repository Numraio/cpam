import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import PageHeader from '@/components/navigation/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';

const Products: NextPageWithLayout = () => {
  const { t } = useTranslation('common');

  return (
    <div className="p-6">
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog and offerings"
        sticky
      />
      <Card variant="elevated">
        <CardBody className="text-center py-12">
          <p className="text-sm text-gray-600">{t('product-placeholder')}</p>
        </CardBody>
      </Card>
    </div>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default Products;
