/**
 * Recommendation List Component
 *
 * Displays actionable recommendations with DNS records and step-by-step guidance.
 */

import { AlertCircle, CheckCircle, Info, Copy, Check } from 'lucide-react';
import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'dns' | 'policy' | 'security' | 'monitoring';
  title: string;
  description: string;
  action: string;
  dnsRecords?: string[];
  impact?: string;
}

export interface RecommendationListProps {
  recommendations: Recommendation[];
  className?: string;
  onRecommendationClick?: (recommendation: Recommendation) => void;
}

// ============================================================================
// Component
// ============================================================================

export function RecommendationList({
  recommendations,
  className = '',
  onRecommendationClick,
}: RecommendationListProps) {
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  if (recommendations.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">All Set!</h3>
        <p className="text-gray-600">
          No recommendations at this time. Your configuration looks good.
        </p>
      </div>
    );
  }

  const getPriorityIcon = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <Info className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getPriorityBadge = (priority: Recommendation['priority']) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colors[priority]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const getCategoryBadge = (category: Recommendation['category']) => {
    const colors = {
      dns: 'bg-purple-100 text-purple-800',
      policy: 'bg-indigo-100 text-indigo-800',
      security: 'bg-red-100 text-red-800',
      monitoring: 'bg-blue-100 text-blue-800',
    };

    const labels = {
      dns: 'DNS',
      policy: 'Policy',
      security: 'Security',
      monitoring: 'Monitoring',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[category]}`}>
        {labels[category]}
      </span>
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRecord(text);
      setTimeout(() => setCopiedRecord(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {recommendations.map((recommendation, index) => (
        <div
          key={index}
          onClick={() => onRecommendationClick?.(recommendation)}
          className={`
            border rounded-lg p-5 transition-all
            ${getPriorityColor(recommendation.priority)}
            ${onRecommendationClick ? 'cursor-pointer hover:shadow-md' : ''}
          `}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 mt-1">{getPriorityIcon(recommendation.priority)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
                {getPriorityBadge(recommendation.priority)}
                {getCategoryBadge(recommendation.category)}
              </div>
              <p className="text-sm text-gray-700">{recommendation.description}</p>
            </div>
          </div>

          {/* Impact */}
          {recommendation.impact && (
            <div className="mb-3 pl-8">
              <p className="text-sm text-gray-600">
                <strong>Impact:</strong> {recommendation.impact}
              </p>
            </div>
          )}

          {/* Action Steps */}
          <div className="mb-3 pl-8">
            <h5 className="text-sm font-semibold text-gray-800 mb-2">Action Steps:</h5>
            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {recommendation.action}
            </div>
          </div>

          {/* DNS Records */}
          {recommendation.dnsRecords && recommendation.dnsRecords.length > 0 && (
            <div className="pl-8">
              <h5 className="text-sm font-semibold text-gray-800 mb-2">DNS Records:</h5>
              <div className="space-y-2">
                {recommendation.dnsRecords.map((record, recordIndex) => (
                  <div
                    key={recordIndex}
                    className="bg-white border border-gray-200 rounded p-3 font-mono text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <code className="text-gray-800 break-all flex-1">{record}</code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(record);
                        }}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedRecord === record ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
