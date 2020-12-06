from textblob import TextBlob
import credentials
import numpy
import tweepy
import sys
import settings
import csv
import mysql.connector
import collections
#d3.js need to learn javascript
# https://bost.ocks.org/mike/map/
#is there a python equivalent


#instead of storing tweets store average number, and standard deviation per each city
# CSV and JSON innefficent
# protocol buffer? (binary file type)
# BSON like JSON but binary 

City = collections.namedtuple("city", ["name","state"])
#alabama = City(name="Huntsville",state="AL")

# database from https://simplemaps.com/data/us-cities
# Part of MyStreamListener in Main.py
# Streaming With Tweepy 
# Override tweepy.StreamListener to add logic to on_status
# Oauth part in Main.ipynb
# Import api/access_token keys from credentials.py

auth  = tweepy.OAuthHandler(credentials.API_KEY, \
                            credentials.API_SECRET_KEY)
auth.set_access_token(credentials.ACCESS_TOKEN,  \
                      credentials.ACCESS_TOKEN_SECRET)
api = tweepy.API(auth)
def deEmojify(text):
    if text:
        return text.encode('ascii', 'ignore').decode('ascii')
    else:
        return None
class MyStreamListener(tweepy.StreamListener):

    def __init__(self, cities):
        super(MyStreamListener,self).__init__()
        self.cities = cities

    def on_status(self, status):
        # Extract info from tweets

        if(status.place):
            id_str = status.id_str
            created_at = status.created_at
            user_created_at = status.user.created_at
  
            if(status.place.place_type=="city" ):
                print(status.place.full_name)
                #make a city tuple
                #print(cities[status.place.name][1])

                place=City(name=status.place.name,state=status.place.full_name[-2:])
                
                if (place in cities):
                      sentiment = TextBlob(deEmojify(status.text)).sentiment
                      polarity = sentiment.polarity
                      subjectivity = sentiment.subjectivity
                      print(deEmojify(status.text))
                      print(sentiment)
                      
                      cities[place][-1]=str(1+int(cities[place][-1]))
                      if (polarity != 0):
                        cities[place][-2]=str((float(cities[place][-2])+polarity))
                      print(cities[place])  

            # ...... and more! 
            # I'll talk about it below! (Or check full-code link above)
    def on_error(self, status_code):
        '''
        Since Twitter API has rate limits, 
        stop srcraping data as it exceed to the thresold.
        '''
        print("ERROR", status_code)
        if status_code == 420:
            # return False to disconnect the stream
            return False
#output = open('stream_output.txt', 'w')

#load the cities to a dict
with open('uscities.csv', mode='r') as inFile:
    reader = csv.reader(inFile)
    #cities = {rows[0]:rows[1:] for rows in reader}
    cities=dict()
    for row in reader:
        town = City(row[1],row[2])
        cities[town]=row[1:]
    #print(cities)
    inFile.close()
myStreamListener = MyStreamListener(cities)
#myStream = tweepy.Stream(auth = api.auth, listener = myStreamListener)
print("hello")
#myStream.filter(languages=["en"], track = settings.TRACK_WORDS)
# However, this part won't be reached as the stream listener won't stop automatically. Press STOP button to finish the process.     
#mydb.close()
stream = tweepy.Stream(auth=api.auth, listener=myStreamListener)
try:
    print('Start streaming.')
    stream.sample(languages=['en'])
    #print(stream.sample)
except KeyboardInterrupt:
    print("Stopped.")
finally:
    #put the cities back into CSV
    with open('uscities.csv', 'w') as outfile:
        writer=csv.writer(outfile)
        for key in cities:
            row=[key.name]+cities[key]
            writer.writerow(row)
        outfile.close()
    print('Done.')
    stream.disconnect()
         