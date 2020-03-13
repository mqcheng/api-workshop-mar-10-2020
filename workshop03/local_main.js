const { join } = require('path');
const fs = require('fs');

//load the library for etag
const preconditions = require['express-preconditions'];
const cors = require('cors');
const range = require('express-range')
const compression = require('compression')

const { Validator, ValidationError } = require('express-json-validator-middleware')
const  OpenAPIValidator  = require('express-openapi-validator').OpenApiValidator;

const schemaValidator = new Validator({ allErrors: true, verbose: true });

const express = require('express')

const data = require('./zips')
const CitiesDB = require('./zipsdb')

//Load application keys
const db = CitiesDB(data);

const app = express();
//disable express etag
app.set('etag',false);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Start of workshop

// TODO 1/2 Load schemans
new OpenAPIValidator ({
    apiSpec : join(__dirname,'schema','zips.yaml')  
}).install(app)
.then(()  => {
    //ok to proceed with the rest of our app
    app.get('/api/states',
    (req,resp) => {   //handler
        const result = db.findAllStates();
        //status code
        resp.status(200)
        //set header, public, age=5min
        resp.set("cache-Control","public,maxAge=300")
        //resp.setHeader('Last-Modified',result.lastModified)
        //set content-type
        resp.type('application/json')
        resp.set('X-generated-on',(new Date()).toDateString())
        resp.json(result)
    }
    )

    const options = {
       stateAsync: (req) =>{
            const state = req.params.abc; 
            const limit = parseInt(req.query.limit) || 10; //default to 10
            const offset = parseInt(req.query.offset) || 10;
            return new Promise.resolve({
                //sample etag "CA_0_10";double code is part of etag
                etag: '"${state}_${offset}_${limit}"'
            })
        }
    }
    
    // TODO GET /api/state/:state
    app.get('/api/state/:abc', //if it is :abc , then it will be req.params.abc
    preconditions(options),
    (req,resp) => {   //handler
        //read the value from the route :state
        const state = req.params.abc; 
        //read the query string
        const limit = parseInt(req.query.limit) || 10; //default to 10
        const offset = parseInt(req.query.offset) || 10;
        const result = db.findCitiesByState(state,
            {offset:offset,limit:limit});
        //const result = db.findCitiesByState(state,
        //	{offset,limit});   /// can do this also , if the key is the same
        //console.info('result: ', result)
        //status code
        resp.status(200)
        //set content-type
        resp.type('application/json')
        resp.set("E-tag",'"${state}_${offset}_${limit}"')
        resp.set('X-generated-on',(new Date()).toDateString())
        resp.json(result)
    }
    )
    
    // TODO GET /api/city/:cityId
    app.get('/api/city/:cityId', 
    (req,resp) => {   //handler
        const cityId = req.params.cityId; 
        const result = db.findCityById(cityId);
        resp.status(200)
        //set content-type
        resp.type('application/json')
        resp.set('X-generated-on',(new Date()).toDateString())
        resp.json(result)
    }
    )
    
    // TODO POST /api/city
    //content type is urlencoded
    app.post('/api/city', 
    (req,resp) => {  
        const body = req.body; //payload
        /*
        if(!db.validateForm(body))
        {
            resp.status(400)
            resp.type('application/json')
            resp.json('message','incomplete form')
            return
        }
        */
        db.insertCity(body);
        resp.status(201)
        resp.type('application/json')
        resp.json('message','create')
    
    }
    )
    
    // Optional workshop
    // TODO HEAD /api/state/:state
    // IMPORTANT: HEAD must be place before GET for the
    // same resource. Otherwise the GET handler will be invoked
    
    // TODO GET /state/:state/count
    app.get('/api/state/:state/count', 
    (req,resp) => {   //handler
        const state = req.params.state; 
        const count = db.countCitiesInState(state)
        const result = {
            state:state,
            numOfCities:count,
            timestamp: (new Date()).toDateString()
        }
        //status code
        resp.status(200)
        //set content-type
        resp.type('application/json')
        resp.set('X-generated-on',(new Date()).toDateString())
        resp.json(result)
    }
    )
    
    //workshop02 above
    app.use('/schema', express.static(join(__dirname, 'schema')));

    app.use((error, req, resp, next) => {

        if (error instanceof ValidationError) {
            console.error('Schema validation error: ', error)
            return resp.status(400).type('application/json').json({ error: error });
        }

        else if (error.status) {
            console.error('OpenAPI specification error: ', error)
            return resp.status(400).type('application/json').json({ error: error });
        }

        console.error('Error: ', error);
        resp.status(400).type('application/json').json({ error: error });

    });

    const PORT = parseInt(process.argv[2] || process.env.APP_PORT) || 3000;
    app.listen(PORT, () => {
        console.info(`Application started on port ${PORT} at ${new Date()}`);
    });
})
.catch (error => {
    //not ok
    

})
// Start of workshop
// TODO 2/2 Copy your routes from workshop02 here

// End of workshop

