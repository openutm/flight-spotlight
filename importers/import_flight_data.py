## A file to import flight data into the Tile 38 instance. 

import redis
import csv

class Tile38Uploader():
    
    def __init__(self):
        self.client = redis.Redis(host='127.0.0.1', port=9851)
    # insert data
    def upload_to_server(self, filename)
        with open(filename, "r") as csvfile:
            datareader = csv.reader(csvfile)
            for row in datareader:
                icao_address = row[0]
                traffic_source =row[1]
                source_type = 0
                lat_dd = row[2]
                lon_dd = row[3]
                time_stamp = row[4]
                altitude_mm = row[4]
            
                result = self.client.excute_command('SET', 'fleet', icao_address, 'FIELD', 'traffic_source ', traffic_source , 'FIELD', 'source_type' ,source_type, 'FIELD', 'time_stamp' ,time_stamp,POINT, lat_dd,lon_dd,altitude_mm)
                
                
        # # print result
    # print result
    # # get data
    # print client.execute_command('GET', 'fleet', 'truck')

if __name__ == '__main__':
    my_uploader = Tile38Uploader()
    my_uploader.upload_to_server(filename='airtraffic_data.csv')