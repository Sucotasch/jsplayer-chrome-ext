import struct
import zlib
import os

def make_png(width, height, color_rgb):
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('!IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png += struct.pack('!I', len(ihdr_data)) + b'IHDR' + ihdr_data
    png += struct.pack('!I', zlib.crc32(b'IHDR' + ihdr_data) & 0xFFFFFFFF)
    
    # IDAT chunk
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00' + bytes(color_rgb) * width
    
    idat_data = zlib.compress(raw_data)
    png += struct.pack('!I', len(idat_data)) + b'IDAT' + idat_data
    png += struct.pack('!I', zlib.crc32(b'IDAT' + idat_data) & 0xFFFFFFFF)
    
    # IEND chunk
    png += struct.pack('!I', 0) + b'IEND'
    png += struct.pack('!I', zlib.crc32(b'IEND') & 0xFFFFFFFF)
    
    return png

os.makedirs('icons', exist_ok=True)

with open('icons/img16.png', 'wb') as f:
    f.write(make_png(16, 16, [102, 126, 234]))
with open('icons/img48.png', 'wb') as f:
    f.write(make_png(48, 48, [102, 126, 234]))
with open('icons/img128.png', 'wb') as f:
    f.write(make_png(128, 128, [102, 126, 234]))

print("Visible blue square icons successfully generated in exact required resolutions!")
