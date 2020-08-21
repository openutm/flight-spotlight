## A file to import flight data into the Secured Flight Spotlight instance. 
import time
import requests 
from dotenv import load_dotenv, find_dotenv
import json
from os import environ as env
import geojson
from geojson import Polygon
ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

class PassportCredentialsGetter():
    def __init__(self):
        pass

    def get_write_credentials(self):        
        payload = {"grant_type":"client_credentials","client_id": env.get('PASSPORT_WRITE_CLIENT_ID'),"client_secret": env.get('PASSPORT_WRITE_CLIENT_SECRET'),"audience": env.get('PASSPORT_WRITE_AUDIENCE'),"scope": env.get('PASSPORT_GEO_FENCE_SCOPE')}        
        url = env.get('PASSPORT_URL') +env.get('PASSPORT_TOKEN_URL')
        
        token_data = requests.post(url, data = payload)
        t_data = token_data.json()
        
        return t_data


class FlightSpotlightUploader():
    
    def __init__(self, credentials):
        
        self.timestamps = [1590000000000,1590000005000, 1590000010000,1590000015000, 1590000020000] 
        
        self.credentials = credentials
    
    def upload_to_server(self, filename):
        with open(filename, "r") as geo_fence_json_file:
            geo_fence_json = geo_fence_json_file.read()
            
        geo_fence_data = json.loads(geo_fence_json)

        for fence_feature in geo_fence_data['features']:

            headers = {"Authorization": "Bearer "+ self.credentials['access_token']}
            try:
                p = Polygon(fence_feature['geometry']['coordinates'])
                assert p.is_valid

            except AssertionError as ae:

                print("Invalid polygon in Geofence")

            else:

                payload = {"geo_fence" :geojson.dumps(p, sort_keys=True)}
                
                securl = 'http://local.test:5000/set_geo_fence'
                try:
                    response = requests.post(securl, data= payload, headers=headers)
                    print(response.content)                
                except Exception as e:
                    print(e)
                else:
                    print("Uploaded Geo Fence")

                    

if __name__ == '__main__':

    my_credentials = PassportCredentialsGetter()
    credentials = my_credentials.get_write_credentials()
    
    my_uploader = FlightSpotlightUploader(credentials = credentials)
    my_uploader.upload_to_server(filename='geojson/geo_fence.geojson')