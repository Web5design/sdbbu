require.paths.unshift(__dirname + '/modules', __dirname + '/lib/node', __dirname);

var simpledb = require('simpledb'),
    fs = require('fs'),
    lr = require('linereader'),
    argv = require('node-optimist').argv;

if (!argv.config) {
    console.log("Must provide --config argument which points to json settings file, such as --config settings.json");
    process.exit(1);
}

var options = {};
try {
    var config = JSON.parse(fs.readFileSync(argv.config, 'utf8'));
    for (var key in config) {
        options[key] = config[key];
    }
} catch(e) {
   console.warn('Invalid JSON config file: ' + options.config);
   throw e;
}

var sdb = new simpledb.SimpleDB({keyid:options.awsKey,secret:options.awsSecret});
var domain = options.domain;
var output = options.output;

if (options.restore) {
    try {
        reader = new lr.linereader(output, 1024);
        while (reader.hasNextLine()) {
            var line = reader.nextLine();
            console.log(JSON.parse(line));
            // @TODO batch put in groups of X items into domain
            // or just put one by one for now.
        }
    } catch (err) {
        console.log("Error reading file.  Error was: " + err);
    }
}

else {
    var file = fs.openSync(output + "_" + new Date().getTime() + ".txt", 'a');
    // Get item names first, then get each item. "select" has a 1MB result
    // therefore we're less likely to hit that limit by getting each
    // individual item.
    sdb.select("SELECT $ItemName FROM " + domain, function(err, res, metadata) {
        if (res) {
            res.forEach(function(item) {
                var obj = {};
                sdb.getItem(domain, item["$ItemName"], function(error, row, rowMeta) {
                    fs.writeSync(file, JSON.stringify(row) + "\n");
                });
            });
        }
    });

}
