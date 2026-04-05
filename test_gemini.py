import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

api_key = 'AIzaSyCGm4KENlm40doxUyzuzgrGWuspA52XiPg'
models = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
]

for model in models:
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    data = json.dumps({'contents':[{'parts':[{'text':'Hello'}]}]}).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    try:
        req = urllib.request.Request(url, data=data, headers=headers)
        res = urllib.request.urlopen(req)
        print(f'SUCCESS: {model}')
        break
    except Exception as e:
        print(f'FAIL {model}: {e}')
