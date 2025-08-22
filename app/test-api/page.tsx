"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestAPIPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async (endpoint: string, data?: any) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const url = `http://localhost:8000/api/v1${endpoint}`
      console.log('Testing URL:', url)
      
      const options: RequestInit = {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }

      if (data) {
        options.body = JSON.stringify(data)
      }

      const response = await fetch(url, options)
      
      console.log('Response status:', response.status)
      console.log('Response headers:', [...response.headers.entries()])
      
      const responseText = await response.text()
      console.log('Response text:', responseText)
      
      try {
        const jsonResult = JSON.parse(responseText)
        setResult(jsonResult)
      } catch {
        setResult({ raw: responseText })
      }
    } catch (err) {
      console.error('API Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">API Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => testAPI('/health')} 
              disabled={loading}
              className="w-full"
            >
              Test Health Check
            </Button>
            
            <Button 
              onClick={() => testAPI('/auth/login', {
                account_name: 'test_user',
                password: '123456'
              })} 
              disabled={loading}
              className="w-full"
            >
              Test User Login
            </Button>
            
            <Button 
              onClick={() => testAPI('/auth/admin/login', {
                account_name: 'admin',
                password: 'admin123'
              })} 
              disabled={loading}
              className="w-full"
            >
              Test Admin Login
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading...</p>}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h3 className="text-red-800 font-medium">Error:</h3>
                <p className="text-red-600">{error}</p>
              </div>
            )}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="text-green-800 font-medium">Success:</h3>
                <pre className="mt-2 text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Backend Server Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Make sure your backend server is running on: <strong>http://localhost:8000</strong>
          </p>
          <Button 
            onClick={() => window.open('http://localhost:8000', '_blank')}
            variant="outline"
          >
            Open Backend in New Tab
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
