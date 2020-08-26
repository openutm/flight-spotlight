## A file to import flight data into the Secured Flight Spotlight instance. 
import time
import requests 
from dotenv import load_dotenv, find_dotenv
import json
from os import environ as env

ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

class PassportCredentialsGetter():
    def __init__(self):
        pass

    def get_write_credentials(self):        
        payload = {"grant_type":"client_credentials","client_id": env.get('PASSPORT_WRITE_CLIENT_ID'),"client_secret": env.get('PASSPORT_WRITE_CLIENT_SECRET'),"audience": env.get('PASSPORT_WRITE_AUDIENCE'),"scope": env.get('PASSPORT_FLIGHT_DECLARATION_SCOPE')}        
        url = env.get('PASSPORT_URL') + env.get('PASSPORT_TOKEN_URL')        
        token_data = requests.post(url, data = payload)
        t_data = token_data.json()        
        return t_data


class FlightSpotlightUploader():
    
    def __init__(self, credentials):
        

    
        self.credentials = credentials
    
    def upload_to_server(self, filename):
        with open(filename, "r") as flight_declaration_file:
            flight_declaration_json = flight_declaration_file.read()
            
        flight_declaration_data = json.loads(flight_declaration_json)
        # print (flight_declaration_data['flight_declaration']['parts'])

        headers = {"Authorization": "Bearer "+ self.credentials['access_token']}
        
        payload = {"flight_declaration" : json.dumps(flight_declaration_data)}                

        securl = 'http://0.0.0.0:5000/set_flight_declaration'
        try:
            response = requests.post(securl, data= payload, headers=headers)
            print(response.content)                
        except Exception as e:
            print(e)
        else:
            print("Uploaded Flight Declarations")                    

if __name__ == '__main__':

    my_credentials = PassportCredentialsGetter()
    credentials = my_credentials.get_write_credentials()

    
    my_uploader = FlightSpotlightUploader(credentials = credentials)
    my_uploader.upload_to_server(filename='flight_declarations/flight-1.json')