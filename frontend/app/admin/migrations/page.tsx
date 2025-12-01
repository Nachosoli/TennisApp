'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/PageLoader';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';

interface Migration {
  name: string;
  timestamp: number;
  executedAt?: Date;
}

export default function AdminMigrationsPage() {
  const { isLoading: authLoading, user, isAdmin } = useRequireAdmin();
  const [migrations, setMigrations] = useState<{
    pending: Migration[];
    executed: Migration[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user && isAdmin) {
      loadMigrations();
    }
  }, [user, isAdmin]);

  const loadMigrations = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getMigrations();
      setMigrations(data);
    } catch (error) {
      console.error('Failed to load migrations:', error);
      setMessage({ type: 'error', text: 'Failed to load migrations' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunMigrations = async () => {
    if (!confirm('Are you sure you want to run all pending migrations? This action cannot be undone.')) {
      return;
    }

    try {
      setIsRunning(true);
      setMessage(null);
      const result = await adminApi.runMigrations();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadMigrations();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to run migrations' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRevertMigration = async () => {
    if (!confirm('Are you sure you want to revert the last migration? This action cannot be undone.')) {
      return;
    }

    try {
      setIsReverting(true);
      setMessage(null);
      const result = await adminApi.revertLastMigration();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadMigrations();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to revert migration' });
    } finally {
      setIsReverting(false);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Database Migrations</h1>
            <p className="text-gray-600 mt-1">Manage database schema migrations</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleRunMigrations}
              disabled={isRunning || isReverting || (migrations?.pending.length || 0) === 0}
            >
              {isRunning ? 'Running...' : `Run Pending (${migrations?.pending.length || 0})`}
            </Button>
            <Button
              variant="outline"
              onClick={handleRevertMigration}
              disabled={isRunning || isReverting || (migrations?.executed.length || 0) === 0}
            >
              {isReverting ? 'Reverting...' : 'Revert Last'}
            </Button>
            <Button variant="outline" onClick={loadMigrations} disabled={isLoading}>
              Refresh
            </Button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Migrations */}
          <Card title={`Pending Migrations (${migrations?.pending.length || 0})`}>
            {migrations?.pending.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending migrations</p>
            ) : (
              <div className="space-y-2">
                {migrations?.pending.map((migration) => (
                  <div
                    key={migration.name}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="font-medium text-gray-900">{migration.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {formatTimestamp(migration.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Executed Migrations */}
          <Card title={`Executed Migrations (${migrations?.executed.length || 0})`}>
            {migrations?.executed.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No executed migrations</p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {migrations?.executed.map((migration) => (
                  <div
                    key={migration.name}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="font-medium text-gray-900">{migration.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Executed: {migration.executedAt ? new Date(migration.executedAt).toLocaleString() : 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Migration Information">
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>Pending Migrations:</strong> These migrations have not been run yet. Click "Run Pending" to execute them.
            </p>
            <p>
              <strong>Executed Migrations:</strong> These migrations have already been applied to the database.
            </p>
            <p>
              <strong>Revert Last:</strong> Reverts the most recently executed migration. Use with caution.
            </p>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-900 mb-1">⚠️ Important Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Always backup your database before running migrations in production</li>
                <li>Migrations are executed in order based on their timestamp</li>
                <li>Reverting a migration may cause data loss if the migration created or modified data</li>
                <li>Some migrations cannot be safely reverted</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

