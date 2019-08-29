import ee,json
ee.Initialize()

out =  'test.geojson'
stats = ee.FeatureCollection('projects/igde-work/CODA_UrbanCanopy/msas-canopy-cover-stats');

def fixer(f):
	c = ee.Number(f.get('canopy_count'))
	nc = ee.Number(f.get('nonCanopy_count'))
	nl = ee.Number(f.get('nullCanopy_count'))
	total = c.add(nc).add(nl)
	cPct = c.divide(total).multiply(100)
	ncPct = nc.divide(total).multiply(100)
	nlPct = nl.divide(total).multiply(100)
	f = f.set({'canopy_total':total,\
	'canopy_pct':cPct,\
	'nonCanopy_pct':ncPct,\
	'nullCanopy_pct':nlPct})
	return f.bounds()

stats = stats.map(fixer)
stats = stats.getInfo()

o = open(out,'w')
o.write(json.dumps(stats))
o.close()