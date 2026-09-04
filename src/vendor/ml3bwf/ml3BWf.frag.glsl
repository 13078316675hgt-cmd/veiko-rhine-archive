/*
"Phases" by @XorDev

I saw a picture of the moon and had to give this a shot

X: X.com/XorDev/status/1731530126280499510
twigl: twigl.app/?ol=true&ss=-Nkn3ji-tzGc86COQNio

<512 chars playlist: shadertoy.com/playlist/N3SyzR
*/

void mainImage(out vec4 O, vec2 I)
{
    //Raymarch distance, step, crator iterator, bump
    float d,s,j,b;
    //Clear fragcolor
    O *= d;
    //Raymarch loop 100 times
    for(vec3 p,r=iResolution; r.z++<1e2;
        //Bumpiness, shading and glow
        O+=(b*b/exp(s*4e2)+(tanh(p.x/b/.1)+1.)/dot(p,p))/3e2)
    {
        //Raymarch position
        p = vec3((I+I-r.xy)/r.y,1)*d,
        //Offset
        p.z -= 2.;
        //Rotate
        p.xz *= mat2(cos(iTime*.3+vec4(0,11,33,0)));
        //Start with a sphere
        s = length(p)-1.;
        //Add bumps
        for(b=j=1.; j<6e1; b+=s+=cos(length(cos(p*j+j))*j*.2)/j*.05)
            //Multiply octave scale
            j*=1.4;
        //Step forward
        d+=s*.2;
    }
}
