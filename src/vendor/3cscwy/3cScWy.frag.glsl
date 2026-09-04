/*
"Fragments" by @XorDev

https://x.com/XorDev/status/1963618494861258842
*/

void mainImage( out vec4 O, vec2 I)
{
    //Iterator, raymarch depth, turbulence frequency and time
    float i,z,f,t=iTime;
    //Raymarch sample point
    vec3 p;
    //Clear fragColor and raymarch 30 steps
    for(O*=i;i++<3e1;
        //Distance field to cylinder + gyroid
        z+=f=.003+abs(length(p.xy)-5.+dot(cos(p),sin(p).yzx))/8.,
        //Color in waves and attenuate light
        O+=(1.+sin(i*.3+z+t+vec4(6,1,2,0)))/f)
        //Compute sample point and iterate through turbulence waves
        //https://mini.gmshaders.com/p/turbulence
        for(p=z*normalize(vec3(I+I,0)-iResolution.xyy),p.z-=t,f=1.;f++<6.;
            //Blocky, stretched waves
            p+=sin(round(p.yxz*6.)/3.*f)/f);
    //Tanh tonemapping
    //https://mini.gmshaders.com/p/func-tanh
    O=tanh(O/1e3);
}
