=begin	


	The original flights.js, compiled by Callum Prentice,
	is a beautiful gift in itself. But it’s also 1.5 MB.
	Our very silly compression routine gets it under 900 KB.
	The original file is organized like so:


	var flights = [
		
		[ originLatitude, originaLongitude, destinationLatitude, destinationLongitude ],
		...
	]


	And the value ranges for the coordinates are:
	latitude    -90 ..  +90    0 .. 180
	longitude  -180 .. +180    0 .. 360

	But with 6 significat digits looks more like:
	0.000000 .. 180.000000    180,000,000
	0.000000 .. 360.000000    360,000,000

	We’re not talking “real” compression here.
	We just want to reduce the number of characters
	that JavaScript needs to pull in.
	So we’ll convert from Base 10 to Base 62:

	A-Z = 26
	a-z = 26
	0-9 = 10
		  --
	      62
	
	Math.pow( 62, 4 ) < 180000000 < Math.pow( 62, 5 )
	Math.pow( 62, 4 ) < 360000000 < Math.pow( 62, 5 )


	In JavaScript Strings must be contained in quotes
	whereas Numbers are raw.
	That makes our storage comparison something like this:

	MOST IMPRESSIVE
	Original:   -123.123456  11 characters long
	Compressed: '12345'       7 characters long

	LEAST IMPRESSIVE
	Original:    0            1 character  long
	Compressed: '0'           3 characters long


	But we can reduce the drag of the required quotes
	by storing all four coordinates as 1 String
	rather than as an Array of 4 Strings.
	Array of Strings: ['A','B','C','D']
	Single String:    ['A|B|C|D']

	We could in theory store the entire dataset as a single
	String, rather than an Array of Strings but the drag of 
	running split() on that just doesn’t seem worth it. 
	We’re already pushing the user’s browser pretty hard!
	Instead we’ll just do split('|') on a single route within
	a loop, reusing a temporary variable and never duplicating
	the entire dataset by splitting it all at once.


=end




def compress input, to_zero


	#  We want to preserve the value of our input
	#  to make debugging / comparing easier (if we want to)
	#  so we’ll do operations on a separate variable.

	n = input


	#  First let’s convert the raw input String
	#  into a floating point number 
	#  so we can do some mathy math on it.

	n = n.to_f


	#  Next we need to bump our values up to 0.
	#  For latitude that means +90.
	#  For longitudes that means +180.

	n += to_zero


	#  We’ve been working with 6 significat digits
	#  which means to ensure an integer we must multiply
	#  by 10^6.

	n *= 1000000


	#  No we do the dirty work:
	
	symbols = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
	radix   = symbols.length#  62, right?
	output  = ''

	while n > 0 do

		remainder = n % radix
		output = symbols[ remainder ] + output
		n = ( n - remainder ) / radix
	end

	return output
end




#  Let’s go through our orginal flights.js
#  and pull out the lat / long coordinates
#  then compress them and output to the console
#  so we can inspect them.

puts "\n\n"
print 'var flights=['
routes_compressed = ''
routes_total = 0
File.foreach( 'flights-original.js' ) do |line| 


	#  First let’s pull out the numeric values.

	coords_compressed = ''
	line.scan( /([0-9|\-|.]+)\,([0-9|\-|.]+)\,([0-9|\-|.]+)\,([0-9|\-|.]+)/ ) do | a, b, c, d |
		
		unless a.nil?

			routes_total += 1
			if routes_total > 1 then
				coords_compressed = ",'"
			else
				coords_compressed = "'"
			end			
			coords_compressed +=
				compress( a,  90 ) +'|' +
				compress( b, 180 ) +'|' +
				compress( c,  90 ) +'|' +
				compress( d, 180 ) +"'"
			print coords_compressed			
			#routes_compressed += coords_compressed
		end
	end
end
print ']'
puts "\n\n"
puts 'Total routes found: '+ routes_total.to_s



