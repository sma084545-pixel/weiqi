from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
R=Path(__file__).resolve().parents[1]/'validation'
for prefix,per,cols,size in [('card',4,2,(1300,1840)),('a4',6,2,(1450,1580)),('mini',2,2,(1060,760))]:
 files=sorted(R.glob(prefix+'-[0-9]*.png'))
 for start in range(0,len(files),per):
  out=Image.new('RGB',size,'#ccc'); rows=(per+cols-1)//cols;cw=size[0]//cols;ch=size[1]//rows
  for i,p in enumerate(files[start:start+per]):
   im=Image.open(p);im.thumbnail((cw-8,ch-24));out.paste(im,(i%cols*cw,i//cols*ch));ImageDraw.Draw(out).text((i%cols*cw+8,(i//cols+1)*ch-20),p.name,fill='black')
  out.save(R/f'{prefix}-contact-{start//per+1}.png')
  ImageOps.grayscale(out).save(R/f'{prefix}-gray-{start//per+1}.png')
print('contact sheets created')
