import { WithLoadingAndError } from '@/components/shared';
import { EmptyState } from '@/components/shared';
import { Team } from '@prisma/client';
import useWebhooks from 'hooks/useWebhooks';
import { useTranslation } from 'next-i18next';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import type { EndpointOut } from 'svix';

import { CreateWebhook, EditWebhook } from '@/components/webhook';
import { defaultHeaders } from '@/lib/common';
import type { ApiResponse } from 'types';
import ConfirmationDialog from '../shared/ConfirmationDialog';
import { Table } from '@/components/shared/table/Table';
import PageHeader from '@/components/navigation/PageHeader';
import { PlusIcon } from '@heroicons/react/24/outline';

const Webhooks = ({ team }: { team: Team }) => {
  const { t } = useTranslation('common');
  const [createWebhookVisible, setCreateWebhookVisible] = useState(false);
  const [updateWebhookVisible, setUpdateWebhookVisible] = useState(false);
  const [endpoint, setEndpoint] = useState<EndpointOut | null>(null);

  const [confirmationDialogVisible, setConfirmationDialogVisible] =
    React.useState(false);

  const [selectedWebhook, setSelectedWebhook] = useState<EndpointOut | null>(
    null
  );

  const { isLoading, isError, webhooks, mutateWebhooks } = useWebhooks(
    team.slug
  );

  const deleteWebhook = async (webhook: EndpointOut | null) => {
    if (!webhook) {
      return;
    }

    const sp = new URLSearchParams({ webhookId: webhook.id });

    const response = await fetch(
      `/api/teams/${team.slug}/webhooks?${sp.toString()}`,
      {
        method: 'DELETE',
        headers: defaultHeaders,
      }
    );

    const json = (await response.json()) as ApiResponse;

    if (!response.ok) {
      toast.error(json.error.message);
      return;
    }

    mutateWebhooks();
    toast.success(t('webhook-deleted'));
  };

  return (
    <WithLoadingAndError isLoading={isLoading} error={isError}>
      <div className="space-y-3">
        <PageHeader
          title={t('webhooks')}
          subtitle={t('webhooks-description')}
          sticky
          primaryAction={
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusIcon className="h-5 w-5" />}
              onClick={() => setCreateWebhookVisible(!createWebhookVisible)}
            >
              {t('add-webhook')}
            </Button>
          }
        />
        {webhooks?.length === 0 ? (
          <EmptyState title={t('no-webhook-title')} />
        ) : (
          <div className="overflow-x-auto">
            <Table
              cols={[t('name'), t('url'), t('created-at'), t('actions')]}
              body={
                webhooks
                  ? webhooks.map((webhook) => {
                      return {
                        id: webhook.id,
                        cells: [
                          {
                            wrap: true,
                            text: webhook.description,
                          },
                          {
                            wrap: true,
                            text: webhook.url,
                          },
                          {
                            wrap: true,
                            text: webhook.createdAt.toLocaleString(),
                          },
                          {
                            buttons: [
                              {
                                text: t('edit'),
                                onClick: () => {
                                  setEndpoint(webhook);
                                  setUpdateWebhookVisible(
                                    !updateWebhookVisible
                                  );
                                },
                              },
                              {
                                color: 'error',
                                text: t('remove'),
                                onClick: () => {
                                  setSelectedWebhook(webhook);
                                  setConfirmationDialogVisible(true);
                                },
                              },
                            ],
                          },
                        ],
                      };
                    })
                  : []
              }
            ></Table>
          </div>
        )}
        {endpoint && (
          <EditWebhook
            visible={updateWebhookVisible}
            setVisible={setUpdateWebhookVisible}
            team={team}
            endpoint={endpoint}
          />
        )}
      </div>
      <ConfirmationDialog
        visible={confirmationDialogVisible}
        onCancel={() => setConfirmationDialogVisible(false)}
        onConfirm={() => deleteWebhook(selectedWebhook)}
        title={t('confirm-delete-webhook')}
      >
        {t('delete-webhook-warning')}
      </ConfirmationDialog>
      <CreateWebhook
        visible={createWebhookVisible}
        setVisible={setCreateWebhookVisible}
        team={team}
      />
    </WithLoadingAndError>
  );
};

export default Webhooks;
