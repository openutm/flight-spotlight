## A file to import flight data into the Tile 38 instance. 

import redis
import json
import time
class Tile38Uploader():
    
    def __init__(self):
        self.client = redis.Redis(host='127.0.0.1', port=9851)
        
        self.timestamps = [1590000000000,1590000005000,1590000010000,1590000015000,1590000020000]
    
    
    def upload_to_server(self, filename):
        with open(filename, "r") as traffic_json_file:
            traffic_json = traffic_json_file.read()
            
        traffic_json = json.loads(traffic_json)['observations']
        
       
        for timestamp in self.timestamps: 
            
            current_timestamp_readings =  [x for x in traffic_json if x['timestamp'] == timestamp]
            
            for current_reading in current_timestamp_readings:
                icao_address = current_reading['icao_address']
                traffic_source = current_reading["traffic_source"]
                source_type = current_reading["source_type"]
                lat_dd = current_reading['lat_dd']
                lon_dd = current_reading['lon_dd']
                time_stamp = current_reading['timestamp']
                altitude_mm = current_reading['altitude_mm']
                print(timestamp)
                self.client.execute_command('SET', 'observation', icao_address, 'FIELD', 'traffic_source ', traffic_source , 'FIELD', 'source_type' ,source_type, 'FIELD', 'time_stamp' ,time_stamp,'POINT', lon_dd, lat_dd,altitude_mm)
                # result = self.client.execute_command('SET', 'observation', icao_address, 'POINT', lon_dd, lat_dd_dd, altitude_mm)
                
            print("Sleeping 5 seconds..")
            time.sleep(5)


if __name__ == '__main__':
    my_uploader = Tile38Uploader()
    my_uploader.upload_to_server(filename='micro_flight_data_single.json')