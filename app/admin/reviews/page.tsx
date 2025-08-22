'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, Star, MessageSquare, ThumbsUp, ThumbsDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

interface Review {
  review_id: number
  product_id: number
  product_name: string
  customer_name: string
  customer_email?: string
  rating: number
  title?: string
  comment: string
  status: string
  helpful_count: number
  created_at: string
  updated_at?: string
  admin_response?: string
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/reviews')
      const data = await response.json()
      
      if (data.success) {
        setReviews(data.data || [])
      } else {
        toast.error('Failed to fetch reviews')
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
      toast.error('Error fetching reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || review.status === statusFilter
    const matchesRating = !ratingFilter || review.rating === parseInt(ratingFilter)
    return matchesSearch && matchesStatus && matchesRating
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'flagged':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getReviewStats = () => {
    const stats = {
      total: reviews.length,
      approved: reviews.filter(r => r.status === 'approved').length,
      pending: reviews.filter(r => r.status === 'pending').length,
      rejected: reviews.filter(r => r.status === 'rejected').length,
      average_rating: reviews.length > 0 ? 
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'
    }
    return stats
  }

  const stats = getReviewStats()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-current text-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Review Management</h1>
          <p className="text-slate-600">Manage customer reviews and ratings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Reviews</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Approved</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.approved}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ThumbsUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pending</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Filter className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Rejected</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.rejected}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <ThumbsDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg Rating</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.average_rating}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer name, product name or comment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="flagged">Flagged</option>
                </select>

                {/* Rating Filter */}
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchReviews}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  Respond to Reviews
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
              <p className="text-gray-500">No reviews match your search criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.review_id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Review Header */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            Review #{review.review_id}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={`flex items-center gap-1 ${getStatusColor(review.status)}`}
                          >
                            {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Product</p>
                            <p className="font-medium">{review.product_name}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Customer</p>
                            <p className="font-medium">{review.customer_name}</p>
                            {review.customer_email && (
                              <p className="text-gray-500">{review.customer_email}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-600">Rating</p>
                            <div className="flex items-center gap-1">
                              {renderStars(review.rating)}
                              <span className={`ml-2 font-medium ${getRatingColor(review.rating)}`}>
                                {review.rating}/5
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 lg:flex-col">
                        {review.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <ThumbsUp className="h-4 w-4" />
                            Approve
                          </Button>
                        )}
                        {review.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <ThumbsDown className="h-4 w-4" />
                            Reject
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Respond
                        </Button>
                      </div>
                    </div>

                    {/* Review Content */}
                    <div className="space-y-3">
                      {review.title && (
                        <div>
                          <p className="text-gray-600 text-sm">Title</p>
                          <p className="font-medium">{review.title}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-600 text-sm">Comment</p>
                        <p className="text-gray-900">{review.comment}</p>
                      </div>
                    </div>

                    {/* Admin Response */}
                    {review.admin_response && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-gray-600 text-sm font-medium mb-1">Admin Response</p>
                        <p className="text-gray-900">{review.admin_response}</p>
                      </div>
                    )}

                    {/* Review Stats */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                          Helpful: {review.helpful_count}
                        </span>
                        <span className="text-gray-600">
                          Product ID: {review.product_id}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(review.created_at)}
                        {review.updated_at && review.updated_at !== review.created_at && (
                          <span className="ml-2">(Updated: {formatDate(review.updated_at)})</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
