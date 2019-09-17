import ee,json,numpy,math
ee.Initialize()

out =  'msa_cover_stats.geojson'
stats = ee.FeatureCollection('projects/igde-work/CODA_UrbanCanopy/msas-canopy-cover-stats2');
# stats = stats.filter(ee.Filter.eq('Name','Los Angeles--Long Beach--Anaheim, CA'))
def zToP(z):
	#From: https://goodcalculators.com/p-value-calculator/
	return (1/numpy.sqrt(2*numpy.pi))*numpy.power(numpy.e,-numpy.power(z,2)/2)
def zToP2(z):
	z = ee.Number(z)
	#From: https://goodcalculators.com/p-value-calculator/
	return (ee.Number(1).divide(numpy.sqrt(2*numpy.pi))).multiply(ee.Number(numpy.e).pow(z.pow(2).multiply(-1).divide(2)))#    (1/numpy.sqrt(2*numpy.pi))*numpy.power(numpy.e,-numpy.power(z,2)/2)
def getZP(f,pop_field_ending,sample_field_ending):
	popSD = ee.Number(f.get('stdDev_temperature'+pop_field_ending))
	sampleSD = ee.Number(f.get('stdDev_temperature'+sample_field_ending))

	popN = ee.Number(f.get('count_temperature'+pop_field_ending))
	sampleN = ee.Number(f.get('count_temperature'+sample_field_ending))

	se = ((popSD.pow(2).divide(popN)).add(sampleSD.pow(2).divide(sampleN))).sqrt()#  popSD.divide(sampleN.sqrt())

	sePop = popSD.divide(popN.sqrt())
	seSample = sampleSD.divide(sampleN.sqrt())

	sampleMean = ee.Number(f.get('mean_temperature'+sample_field_ending))
	popMean = ee.Number(f.get('mean_temperature'+pop_field_ending))

	z = (sampleMean.subtract(popMean)).divide(se)
	p = zToP2(z)
	f = f.set({'mean_temperature'+sample_field_ending:ee.Number.parse(sampleMean.format('%.4f')),'mean_temperature'+pop_field_ending :ee.Number.parse(popMean.format('%.4f'))})
	f = f.set({'se_temperature'+ pop_field_ending:ee.Number.parse(sePop.format('%.4f')),'se_temperature'+ sample_field_ending:ee.Number.parse(seSample.format('%.4f'))})
	return f.set({'se_temperature'+pop_field_ending+ sample_field_ending:ee.Number.parse(se.format('%.4f')),'zscore_temperature'+pop_field_ending+ sample_field_ending: ee.Number.parse(z.format('%.4f')),'pzscore_temperature'+pop_field_ending+sample_field_ending:ee.Number.parse(p.format('%.20f'))})
	# print(p.getInfo(),zToP(1.96),zToP2(1.96).getInfo())
	# print(se.getInfo(),z.getInfo(),p,zToP(1.96),zToP(-1.96))
def fixer(f):
	c = ee.Number(f.get('canopy_count'))
	nc = ee.Number(f.get('nonCanopy_count'))
	nl = ee.Number(f.get('nullCanopy_count'))
	total = c.add(nc).add(nl)
	cPct = ee.Number.parse(c.divide(total).multiply(100).format('%.2f'))
	ncPct = ee.Number.parse(nc.divide(total).multiply(100).format('%.2f'))
	nlPct = ee.Number.parse(nl.divide(total).multiply(100).format('%.2f'))
	f = f.set({'canopy_total':total,\
	'canopy_pct':cPct,\
	'nonCanopy_pct':ncPct,\
	'nullCanopy_pct':nlPct})
	f = getZP(f,'_nonCanopy','_canopy')
	
	# f = getZP(f,'_all','_nonCanopy')
	return f.convexHull()#.simplify(10000)#.bounds()

# ff = ee.Feature(stats.first())
# print(getZP(ff,'_all','_canopy').getInfo())
# ps = map(lambda i:zToP(i),range(0,5))
# print(ps)

stats = stats.map(fixer)
stats = stats.getInfo()

o = open(out,'w')
o.write(json.dumps(stats))
o.close()