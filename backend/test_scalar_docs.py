import requests

BASE_URL = "http://localhost:8009"

def test_scalar_docs():
    """Test Scalar API documentation."""
    print("=== Testing Scalar API Documentation ===")
    
    try:
        response = requests.get(f"{BASE_URL}/scalar")
        print(f"Scalar Docs Status: {response.status_code}")
        
        if response.status_code == 200:
            print("[OK] Scalar documentation is working!")
            print(f"Content-Type: {response.headers.get('content-type')}")
            print(f"Content-Length: {len(response.text)} characters")
            
            # Check if it's actually Scalar content
            if 'scalar' in response.text.lower() or 'api-reference' in response.text.lower():
                print("[OK] Scalar content detected")
            else:
                print("[WARN] May not be Scalar content")
        else:
            print(f"[FAIL] Scalar docs not accessible: {response.text}")
            
        return response.status_code == 200
    except Exception as e:
        print(f"[FAIL] Error accessing Scalar docs: {e}")
        return False

def test_openapi_json():
    """Test OpenAPI JSON endpoint."""
    print("\n=== Testing OpenAPI JSON ===")
    
    try:
        response = requests.get(f"{BASE_URL}/openapi.json")
        print(f"OpenAPI Status: {response.status_code}")
        
        if response.status_code == 200:
            api_spec = response.json()
            print(f"[OK] OpenAPI spec loaded")
            print(f"Title: {api_spec.get('info', {}).get('title', 'N/A')}")
            print(f"Version: {api_spec.get('info', {}).get('version', 'N/A')}")
            print(f"Endpoints: {len(api_spec.get('paths', {}))}")
            
            # List some endpoints
            paths = list(api_spec.get('paths', {}).keys())
            print("Sample endpoints:")
            for path in paths[:5]:
                print(f"  {path}")
        else:
            print(f"[FAIL] OpenAPI not accessible: {response.text}")
            
        return response.status_code == 200
    except Exception as e:
        print(f"[FAIL] Error accessing OpenAPI: {e}")
        return False

def test_health_check():
    """Test health check."""
    print("\n=== Testing Health Check ===")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"[FAIL] Health check error: {e}")
        return False

def main():
    """Run Scalar documentation tests."""
    print("SCALAR API DOCUMENTATION TEST")
    print("=" * 40)
    
    results = {}
    
    # Test health check
    results['health'] = test_health_check()
    
    # Test OpenAPI JSON
    results['openapi'] = test_openapi_json()
    
    # Test Scalar docs
    results['scalar'] = test_scalar_docs()
    
    # Summary
    print("\n" + "=" * 40)
    print("SCALAR DOCUMENTATION STATUS")
    print("=" * 40)
    
    print(f"Health Check: {'[OK] WORKING' if results['health'] else '[FAIL] FAILED'}")
    print(f"OpenAPI JSON: {'[OK] WORKING' if results['openapi'] else '[FAIL] FAILED'}")
    print(f"Scalar Docs: {'[OK] WORKING' if results['scalar'] else '[FAIL] FAILED'}")
    
    print("\nCONCLUSION:")
    working_count = sum(results.values())
    total_count = 3
    
    if working_count == 3:
        print("[OK] Scalar documentation is COMPLETE!")
        print(f"[INFO] Access at: {BASE_URL}/docs")
        print("[INFO] Ready for frontend integration")
    else:
        print(f"[PARTIAL] {working_count}/{total_count} systems working")
        print("[INFO] Some fixes may be needed")
    
    print(f"\nOverall Progress: {working_count}/{total_count} ({int(working_count/total_count*100)}%)")

if __name__ == "__main__":
    main()
