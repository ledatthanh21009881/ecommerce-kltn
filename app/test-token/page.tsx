'use client'

import { useState, useEffect } from 'react'
import { tokenManager } from '@/lib/token-manager'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestTokenPage() {
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [apiResult, setApiResult] = useState<any>(null)

  useEffect(() => {
    updateTokenInfo()
  }, [])

  const updateTokenInfo = () => {
    const token = tokenManager.getAccessToken()
    const refreshToken = tokenManager.getRefreshToken()
    const isExpired = tokenManager.isTokenExpired()

    setTokenInfo({
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      isExpired,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'None',
      refreshTokenPreview: refreshToken ? `${refreshToken.substring(0, 20)}...` : 'None'
    })
  }

  const testApiCall = async () => {
    try {
      const response = await apiClient.get('/categories')
      setApiResult({
        success: true,
        data: response
      })
    } catch (error) {
      setApiResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const testRefreshToken = async () => {
    try {
      const result = await tokenManager.refreshToken()
      setApiResult({
        success: true,
        data: 'Token refreshed successfully',
        newToken: result.token.substring(0, 20) + '...'
      })
      updateTokenInfo()
    } catch (error) {
      setApiResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const clearTokens = () => {
    tokenManager.clearTokens()
    updateTokenInfo()
    setApiResult(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Token Manager Test</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <strong>Has Access Token:</strong> {tokenInfo?.hasToken ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Has Refresh Token:</strong> {tokenInfo?.hasRefreshToken ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Is Expired:</strong> {tokenInfo?.isExpired ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Access Token:</strong> {tokenInfo?.tokenPreview}
            </div>
            <div>
              <strong>Refresh Token:</strong> {tokenInfo?.refreshTokenPreview}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testApiCall} className="w-full">
              Test API Call
            </Button>
            <Button onClick={testRefreshToken} className="w-full">
              Test Refresh Token
            </Button>
            <Button onClick={clearTokens} variant="destructive" className="w-full">
              Clear Tokens
            </Button>
            <Button onClick={updateTokenInfo} variant="outline" className="w-full">
              Refresh Info
            </Button>
          </CardContent>
        </Card>
      </div>

      {apiResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>API Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
