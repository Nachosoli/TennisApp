'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { adminApi } from '@/lib/admin';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Report } from '@/types';
import { format } from 'date-fns';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { PageLoader } from '@/components/ui/PageLoader';

export default function AdminReportsPage() {
  const router = useRouter();
  const { isLoading: authLoading, user, isAdmin } = useRequireAdmin();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const data = await adminApi.getAllReports(status);
      setReports(data.reports);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadReports();
    }
  }, [user, isAdmin, statusFilter]);

  if (authLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return null; // Redirect handled by useRequireAdmin
  }

  if (isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  const handleStatusChange = async (reportId: string, status: string) => {
    try {
      if (status === 'resolved') {
        await adminApi.resolveReport(reportId, 'Resolved by admin');
      } else if (status === 'dismissed') {
        await adminApi.dismissReport(reportId);
      }
      loadReports();
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to update report status:', error);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewing':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'user':
        return 'User Report';
      case 'match':
        return 'Match Report';
      case 'court':
        return 'Court Report';
      default:
        return type;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Report Management</h1>
          <Button variant="outline" onClick={() => router.back()}>
            Back to Dashboard
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex space-x-2">
            {['all', 'pending', 'reviewing', 'resolved', 'dismissed'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </Card>

        {/* Reports List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600">No reports found</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="cursor-pointer" onClick={() => setSelectedReport(report)}>
                <Card className="hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.status)}`}>
                        {report.status.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {getReportTypeLabel(report.reportType)}
                      </span>
                    </div>
                    <p className="text-gray-900 mb-2">{report.reason}</p>
                    <p className="text-sm text-gray-500">
                      Reported on {format(new Date(report.createdAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReport(report);
                    }}
                  >
                    View Details
                  </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">Report Details</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="font-medium text-gray-700">Status:</span>{' '}
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Type:</span>{' '}
                  <span className="text-gray-900">{getReportTypeLabel(selectedReport.reportType)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Reason:</span>
                  <p className="text-gray-900 mt-1">{selectedReport.reason}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Reported on:</span>{' '}
                  <span className="text-gray-900">
                    {format(new Date(selectedReport.createdAt), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                {selectedReport.resolvedAt && (
                  <div>
                    <span className="font-medium text-gray-700">Resolved on:</span>{' '}
                    <span className="text-gray-900">
                      {format(new Date(selectedReport.resolvedAt), 'MMM d, yyyy HH:mm')}
                    </span>
                  </div>
                )}

                {selectedReport.status === 'pending' && (
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => handleStatusChange(selectedReport.id, 'resolved')}
                    >
                      Resolve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleStatusChange(selectedReport.id, 'dismissed')}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}

